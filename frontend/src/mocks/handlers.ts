import { http, HttpResponse } from "msw"

import {
  MOCK_PASSWORD,
  createDefaultEventTemplates,
  mockConnections,
  mockEventInvites,
  mockEventTemplates,
  mockEvents,
  mockGroups,
  mockNetworkInvites,
  mockNotifications,
  mockUsers,
  type MockConnection,
  type MockEvent,
  type MockEventInvite,
  type MockEventTemplate,
  type MockGroup,
  type MockNetworkInvite,
  type MockUser,
} from "./data"

// Mirrors internal/notification's Service.PageSize.
const NOTIFICATIONS_PAGE_SIZE = 30

// Mutable in-memory copies so writes made during a session don't leak
// between page reloads or affect the fixtures other handlers read from.
let events = [...mockEvents]
let eventInvites = [...mockEventInvites]
let eventTemplates = [...mockEventTemplates]
let groups = [...mockGroups]
let connections = [...mockConnections]
let notifications = [...mockNotifications]
let users = [...mockUsers]
let currentUser = users[0]
let networkInvites = [...mockNetworkInvites]
let pushSubscriptions: {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  createdAt: string
}[] = []

// Every handler below only ever replaces these arrays wholesale (never
// mutates an existing mock*/array item in place), so re-seeding from the
// mock* fixtures here is enough to undo any writes a test made. Call this
// between tests — see src/test/setup.ts — so one test's POST/PATCH/DELETE
// can't leak into the next.
export function resetMockData() {
  events = [...mockEvents]
  eventInvites = [...mockEventInvites]
  eventTemplates = [...mockEventTemplates]
  groups = [...mockGroups]
  connections = [...mockConnections]
  notifications = [...mockNotifications]
  users = [...mockUsers]
  currentUser = users[0]
  networkInvites = [...mockNetworkInvites]
  pushSubscriptions = []
}

function serializeConnection(connection: MockConnection) {
  const contact = users.find((user) => user.id === connection.contactId)
  const group = connection.groupId
    ? groups.find((candidate) => candidate.id === connection.groupId)
    : undefined
  return {
    contactId: connection.contactId,
    contactName: contact?.name ?? "",
    contactEmail: contact?.email ?? "",
    createdAt: connection.createdAt,
    isFavorite: connection.isFavorite,
    groupId: group?.id,
    groupName: group?.name,
    groupIsFavorite: group?.isFavorite,
    eventsTogetherCount: eventsTogetherCount(connection.userId, connection.contactId),
  }
}

// Mirrors internal/network's LATERAL join: how many events both users attended
// (as owner or non-declined invitee), counted once even if it also shows up
// via listPotentialConnections' shared-event logic.
function eventsTogetherCount(userId: string, contactId: string): number {
  let count = 0
  for (const evt of events) {
    const attendees = eventAttendees(evt.id)
    if (attendees.has(userId) && attendees.has(contactId)) {
      count += 1
    }
  }
  return count
}

// Attendees of an event: its owner, plus anyone invited whose invite hasn't
// been declined — mirrors the backend's proxy for "attended" (there's no
// check-in/RSVP-confirmation concept yet).
function eventAttendees(eventId: string): Set<string> {
  const attendees = new Set<string>()
  const event = events.find((candidate) => candidate.id === eventId)
  if (event) {
    attendees.add(event.ownerId)
  }
  for (const invite of eventInvites) {
    if (invite.eventId === eventId && invite.status !== "declined") {
      attendees.add(invite.invitedUserId)
    }
  }
  return attendees
}

// Mirrors internal/event/service.go's rsvpClosed: once the deadline has
// passed, only the event's owner may change the guest list.
function isRsvpClosed(event: MockEvent): boolean {
  return Boolean(
    event.rsvpDeadline && new Date(event.rsvpDeadline).getTime() < Date.now(),
  )
}

function listPotentialConnections(userId: string) {
  const myEventIds = new Set(
    events
      .filter((event) => event.ownerId === userId)
      .map((event) => event.id),
  )
  for (const invite of eventInvites) {
    if (invite.invitedUserId === userId && invite.status !== "declined") {
      myEventIds.add(invite.eventId)
    }
  }

  const connectedContactIds = new Set(
    connections
      .filter((connection) => connection.userId === userId)
      .map((connection) => connection.contactId),
  )

  const sharedEventCountByUserId = new Map<string, number>()
  for (const eventId of myEventIds) {
    for (const attendeeId of eventAttendees(eventId)) {
      if (attendeeId === userId || connectedContactIds.has(attendeeId)) {
        continue
      }
      sharedEventCountByUserId.set(
        attendeeId,
        (sharedEventCountByUserId.get(attendeeId) ?? 0) + 1,
      )
    }
  }

  return [...sharedEventCountByUserId.entries()]
    .map(([candidateId, sharedEventCount]) => {
      const user = users.find((candidate) => candidate.id === candidateId)
      return {
        userId: candidateId,
        name: user?.name ?? "",
        email: user?.email ?? "",
        sharedEventCount,
      }
    })
    .sort((a, b) => b.sharedEventCount - a.sharedEventCount)
}

export const handlers = [
  http.post("/api/auth/register", async ({ request }) => {
    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
      address?: string
    }
    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return new HttpResponse("invalid request body", { status: 400 })
    }
    const email = body.email.trim().toLowerCase()
    if (users.some((user) => user.email === email)) {
      return new HttpResponse("user already exists with this email", {
        status: 409,
      })
    }
    const address = body.address?.trim()
    const created: MockUser = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      email,
      joinedAt: new Date().toISOString(),
      ...(address ? { address } : {}),
    }
    users = [...users, created]

    // Mirrors auth.Service.Register's ResolvePendingInvites call: connect
    // the new user to everyone who invited this email, in both directions,
    // and mark those invites accepted.
    const pending = networkInvites.filter(
      (invite) => invite.invitedEmail === email && !invite.acceptedAt,
    )
    for (const invite of pending) {
      if (!connections.some((c) => c.userId === invite.inviterId && c.contactId === created.id)) {
        connections = [
          ...connections,
          { userId: invite.inviterId, contactId: created.id, createdAt: new Date().toISOString(), isFavorite: false },
        ]
      }
      if (!connections.some((c) => c.userId === created.id && c.contactId === invite.inviterId)) {
        connections = [
          ...connections,
          { userId: created.id, contactId: invite.inviterId, createdAt: new Date().toISOString(), isFavorite: false },
        ]
      }
    }
    networkInvites = networkInvites.map((invite) =>
      pending.includes(invite) ? { ...invite, acceptedAt: new Date().toISOString() } : invite,
    )

    // Mirrors auth.Service.Register's SeedDefaultTemplates call.
    eventTemplates = [...eventTemplates, ...createDefaultEventTemplates(created.id)]

    return HttpResponse.json(created)
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }
    const user = users.find((candidate) => candidate.email === body.email)
    if (!user || body.password !== MOCK_PASSWORD) {
      return new HttpResponse("invalid credentials", { status: 401 })
    }
    return HttpResponse.json(user)
  }),

  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),

  http.patch("/api/me", async ({ request }) => {
    const body = (await request.json()) as Partial<Pick<MockUser, "name" | "address">>
    if (body.name !== undefined && !body.name.trim()) {
      return new HttpResponse("name can't be empty", { status: 400 })
    }
    const index = users.findIndex((user) => user.id === currentUser.id)
    const updated: MockUser = {
      ...users[index],
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.address !== undefined ? { address: body.address.trim() || undefined } : {}),
    }
    users = users.map((user, i) => (i === index ? updated : user))
    currentUser = updated
    return HttpResponse.json(updated)
  }),

  http.get("/api/events", ({ request }) => {
    const url = new URL(request.url)
    const scope = url.searchParams.get("scope") ?? "owned"
    const sortField =
      url.searchParams.get("sort") === "createdAt" ? "createdAt" : "date"
    const order = url.searchParams.get("order") === "asc" ? "asc" : "desc"

    let scoped: MockEvent[]
    if (scope === "invited") {
      const invitedEventIds = new Set(
        eventInvites
          .filter((invite) => invite.invitedUserId === currentUser.id)
          .map((invite) => invite.eventId),
      )
      scoped = events.filter((event) => invitedEventIds.has(event.id))
    } else if (scope === "all") {
      scoped = events
    } else {
      scoped = events.filter((event) => event.ownerId === currentUser.id)
    }

    const sorted = [...scoped].sort((a, b) => {
      const diff =
        new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime()
      return order === "asc" ? diff : -diff
    })

    // Mirrors internal/event's EventView: the real GET /events enriches each
    // event with the viewer's relationship to it (isOwner/viewerInviteStatus)
    // so the listing UI can power its Hosting/Invited filters and host/
    // accepted badges without a per-event follow-up request.
    const withViewerContext = sorted.map((event) => {
      const invite = eventInvites.find(
        (candidate) =>
          candidate.eventId === event.id &&
          candidate.invitedUserId === currentUser.id,
      )
      return {
        ...event,
        isOwner: event.ownerId === currentUser.id,
        viewerInviteStatus: invite?.status,
      }
    })

    return HttpResponse.json(withViewerContext)
  }),

  http.post("/api/events", async ({ request }) => {
    const body = (await request.json()) as Partial<MockEvent>
    if (!body.name?.trim()) {
      return new HttpResponse("name must not be empty", { status: 400 })
    }
    if ((body.defaultSpreadAllowed ?? 0) < 0) {
      return new HttpResponse("spread can't be negative", { status: 400 })
    }
    const created: MockEvent = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      name: body.name.trim(),
      description: body.description ?? "",
      createdAt: new Date().toISOString(),
      date: body.date ?? new Date().toISOString(),
      location: body.location ?? "",
      rsvpDeadline: body.rsvpDeadline,
      type: body.type ?? "party",
      defaultSpreadAllowed: body.defaultSpreadAllowed ?? 0,
      mood: body.mood,
      icon: body.icon,
      latitude: body.latitude,
      longitude: body.longitude,
    }
    events = [...events, created]
    return HttpResponse.json(created)
  }),

  http.patch("/api/events/:id", async ({ request, params }) => {
    const index = events.findIndex((event) => event.id === params.id)
    if (index === -1) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const body = (await request.json()) as Partial<MockEvent> & { clearIcon?: boolean }
    const updated = { ...events[index], ...body }
    if (body.clearIcon) {
      updated.icon = undefined
    }
    events[index] = updated
    return HttpResponse.json(updated)
  }),

  http.get("/api/events/:id", ({ params }) => {
    const event = events.find((candidate) => candidate.id === params.id)
    if (!event) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const isOwner = event.ownerId === currentUser.id
    const invite = eventInvites.find(
      (candidate) =>
        candidate.eventId === event.id &&
        candidate.invitedUserId === currentUser.id,
    )
    if (!isOwner && !invite) {
      return new HttpResponse("event not found", { status: 404 })
    }
    return HttpResponse.json({
      ...event,
      isOwner,
      viewerInviteStatus: isOwner ? undefined : invite?.status,
      viewerSpreadAllowed: isOwner ? undefined : invite?.spreadAllowed,
      viewerDeclineReason: isOwner ? undefined : invite?.declineReason,
    })
  }),

  // Owner + everyone with an invite (pending, accepted, or declined) — mirrors
  // internal/event/repository.go's ListEventAttendees, including status and
  // invitedBy so the frontend can group by status and gate who can remove
  // whom.
  http.get("/api/events/:id/attendees", ({ params }) => {
    const event = events.find((candidate) => candidate.id === params.id)
    if (!event) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const isOwner = event.ownerId === currentUser.id
    const isInvited = eventInvites.some(
      (invite) =>
        invite.eventId === event.id &&
        invite.invitedUserId === currentUser.id,
    )
    if (!isOwner && !isInvited) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const owner = users.find((candidate) => candidate.id === event.ownerId)
    const attendees = [
      { userId: event.ownerId, name: owner?.name ?? "", email: owner?.email ?? "", isOwner: true },
      ...eventInvites
        .filter((invite) => invite.eventId === event.id)
        .map((invite) => {
          const user = users.find((candidate) => candidate.id === invite.invitedUserId)
          return {
            userId: invite.invitedUserId,
            name: user?.name ?? "",
            email: user?.email ?? "",
            isOwner: false,
            status: invite.status,
            invitedBy: invite.invitedBy,
            declineReason: invite.declineReason,
          }
        }),
    ]
    return HttpResponse.json(attendees)
  }),

  http.patch("/api/events/:id/invite", async ({ request, params }) => {
    const index = eventInvites.findIndex(
      (invite) =>
        invite.eventId === params.id &&
        invite.invitedUserId === currentUser.id,
    )
    if (index === -1) {
      return new HttpResponse("invite not found", { status: 404 })
    }
    const event = events.find((candidate) => candidate.id === params.id)
    if (event && isRsvpClosed(event)) {
      return new HttpResponse(
        "rsvp deadline has passed; only the host can update the guest list",
        { status: 403 },
      )
    }
    const body = (await request.json()) as {
      status?: "accepted" | "declined"
      reason?: string
    }
    if (body.status !== "accepted" && body.status !== "declined") {
      return new HttpResponse("status must be 'accepted' or 'declined'", {
        status: 400,
      })
    }
    const declineReason =
      body.status === "declined" && body.reason?.trim()
        ? body.reason.trim()
        : undefined
    eventInvites[index] = {
      ...eventInvites[index],
      status: body.status,
      declineReason,
    }
    return HttpResponse.json(eventInvites[index])
  }),

  http.delete("/api/events/:id", ({ params }) => {
    if (!events.some((event) => event.id === params.id)) {
      return new HttpResponse("event not found", { status: 404 })
    }
    events = events.filter((event) => event.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post("/api/events/invites", async ({ request }) => {
    const body = (await request.json()) as {
      eventId?: string
      invitedUserId?: string
      spreadAllowed?: number
    }
    if (!body.eventId || !events.some((event) => event.id === body.eventId)) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const event = events.find((candidate) => candidate.id === body.eventId)!
    if (event.ownerId !== currentUser.id && isRsvpClosed(event)) {
      return new HttpResponse(
        "rsvp deadline has passed; only the host can update the guest list",
        { status: 403 },
      )
    }
    const created: MockEventInvite = {
      eventId: body.eventId,
      invitedBy: currentUser.id,
      invitedUserId: body.invitedUserId ?? "",
      status: "pending",
      spreadAllowed: body.spreadAllowed ?? 0,
      createdAt: new Date().toISOString(),
    }
    eventInvites = [...eventInvites, created]
    return HttpResponse.json(created)
  }),

  http.delete("/api/events/:id/invites/:userId", ({ params }) => {
    const index = eventInvites.findIndex(
      (invite) =>
        invite.eventId === params.id && invite.invitedUserId === params.userId,
    )
    if (index === -1) {
      return new HttpResponse("invite not found", { status: 404 })
    }
    const event = events.find((candidate) => candidate.id === params.id)
    const invite = eventInvites[index]
    const isOwner = event?.ownerId === currentUser.id
    if (!isOwner && event && isRsvpClosed(event)) {
      return new HttpResponse(
        "rsvp deadline has passed; only the host can update the guest list",
        { status: 403 },
      )
    }
    if (!isOwner && invite.invitedBy !== currentUser.id) {
      return new HttpResponse("user not allowed to remove this guest", {
        status: 403,
      })
    }
    eventInvites = eventInvites.filter((_, i) => i !== index)
    return new HttpResponse(null, { status: 204 })
  }),

  // Sorted oldest-first, mirroring the real ORDER BY created_at ASC so
  // default templates show up in seed order ahead of anything a user adds.
  http.get("/api/event-templates", () => {
    const own = eventTemplates
      .filter((template) => template.ownerId === currentUser.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return HttpResponse.json(own)
  }),

  http.post("/api/event-templates", async ({ request }) => {
    const body = (await request.json()) as Partial<MockEventTemplate>
    if (!body.name?.trim()) {
      return new HttpResponse("template name must not be empty", { status: 400 })
    }
    if (!body.title?.trim()) {
      return new HttpResponse("template title must not be empty", { status: 400 })
    }
    const created: MockEventTemplate = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      name: body.name.trim(),
      icon: body.icon?.trim() || undefined,
      createdAt: new Date().toISOString(),
      title: body.title.trim(),
      dateOption: body.dateOption ?? "none",
      timeOfDay: body.timeOfDay,
      location: body.location?.trim() ?? "",
      rsvpDeadlineAmount: body.rsvpDeadlineAmount,
      rsvpDeadlineUnit: body.rsvpDeadlineUnit,
      mood: body.mood,
      description: body.description?.trim() ?? "",
    }
    eventTemplates = [...eventTemplates, created]
    return HttpResponse.json(created)
  }),

  http.patch("/api/event-templates/:id", async ({ request, params }) => {
    const index = eventTemplates.findIndex(
      (template) => template.id === params.id && template.ownerId === currentUser.id,
    )
    if (index === -1) {
      return new HttpResponse("event template not found", { status: 404 })
    }
    const body = (await request.json()) as Partial<MockEventTemplate> & {
      clearTimeOfDay?: boolean
      clearRsvpDeadline?: boolean
      clearIcon?: boolean
    }
    const updated = { ...eventTemplates[index] }
    if (body.name !== undefined) updated.name = body.name.trim()
    if (body.clearIcon) {
      updated.icon = undefined
    } else if (body.icon !== undefined) {
      updated.icon = body.icon.trim()
    }
    if (body.title !== undefined) updated.title = body.title.trim()
    if (body.dateOption !== undefined) updated.dateOption = body.dateOption
    if (body.clearTimeOfDay) {
      updated.timeOfDay = undefined
    } else if (body.timeOfDay !== undefined) {
      updated.timeOfDay = body.timeOfDay
    }
    if (body.location !== undefined) updated.location = body.location.trim()
    if (body.clearRsvpDeadline) {
      updated.rsvpDeadlineAmount = undefined
      updated.rsvpDeadlineUnit = undefined
    } else {
      if (body.rsvpDeadlineAmount !== undefined) updated.rsvpDeadlineAmount = body.rsvpDeadlineAmount
      if (body.rsvpDeadlineUnit !== undefined) updated.rsvpDeadlineUnit = body.rsvpDeadlineUnit
    }
    if (body.mood !== undefined) updated.mood = body.mood
    if (body.description !== undefined) updated.description = body.description.trim()
    eventTemplates = eventTemplates.map((template, i) => (i === index ? updated : template))
    return HttpResponse.json(updated)
  }),

  http.delete("/api/event-templates/:id", ({ params }) => {
    if (
      !eventTemplates.some(
        (template) => template.id === params.id && template.ownerId === currentUser.id,
      )
    ) {
      return new HttpResponse("event template not found", { status: 404 })
    }
    eventTemplates = eventTemplates.filter((template) => template.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get("/api/groups", () => {
    const ownGroups = groups
      .filter((group) => group.ownerId === currentUser.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    return HttpResponse.json(ownGroups)
  }),

  http.post("/api/groups", async ({ request }) => {
    const body = (await request.json()) as Partial<MockGroup>
    if (!body.name?.trim()) {
      return new HttpResponse("group name must not be empty", {
        status: 400,
      })
    }
    const created: MockGroup = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      name: body.name.trim(),
      createdAt: new Date().toISOString(),
      isFavorite: false,
    }
    groups = [...groups, created]
    return HttpResponse.json(created)
  }),

  http.patch("/api/groups/:id", async ({ request, params }) => {
    const index = groups.findIndex((group) => group.id === params.id)
    if (index === -1) {
      return new HttpResponse("group not found", { status: 404 })
    }
    const body = (await request.json()) as Partial<MockGroup>
    groups[index] = { ...groups[index], ...body }
    return HttpResponse.json(groups[index])
  }),

  http.delete("/api/groups/:id", ({ params }) => {
    if (!groups.some((group) => group.id === params.id)) {
      return new HttpResponse("group not found", { status: 404 })
    }
    groups = groups.filter((group) => group.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get("/api/network", () => {
    const ownConnections = connections
      .filter((connection) => connection.userId === currentUser.id)
      .map(serializeConnection)
    return HttpResponse.json(ownConnections)
  }),

  http.get("/api/network/potential", () => {
    return HttpResponse.json(listPotentialConnections(currentUser.id))
  }),

  http.get("/api/network/lookup", ({ request }) => {
    const email = new URL(request.url).searchParams.get("email")?.trim()
    if (!email) {
      return new HttpResponse("email is required", { status: 400 })
    }
    const user = users.find((candidate) => candidate.email === email)
    if (!user) {
      return new HttpResponse("user not found", { status: 404 })
    }
    return HttpResponse.json({ userId: user.id, name: user.name, email: user.email })
  }),

  // Mirrors POST /network/invite: sends (mock) an invite to an email with
  // no account yet. Idempotent per (inviter, email) — re-inviting refreshes
  // the existing pending row instead of duplicating it.
  http.post("/api/network/invite", async ({ request }) => {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase()
    if (!email) {
      return new HttpResponse("email is required", { status: 400 })
    }
    if (users.some((user) => user.email === email)) {
      return new HttpResponse("a user with this email is already registered", {
        status: 409,
      })
    }

    const existingIndex = networkInvites.findIndex(
      (invite) =>
        invite.inviterId === currentUser.id && invite.invitedEmail === email && !invite.acceptedAt,
    )
    if (existingIndex !== -1) {
      const refreshed: MockNetworkInvite = {
        ...networkInvites[existingIndex],
        createdAt: new Date().toISOString(),
      }
      networkInvites = networkInvites.map((invite, i) => (i === existingIndex ? refreshed : invite))
      return HttpResponse.json(refreshed)
    }

    const created: MockNetworkInvite = {
      id: crypto.randomUUID(),
      inviterId: currentUser.id,
      invitedEmail: email,
      createdAt: new Date().toISOString(),
    }
    networkInvites = [...networkInvites, created]
    return HttpResponse.json(created)
  }),

  http.post("/api/network", async ({ request }) => {
    const body = (await request.json()) as {
      contactId?: string
      groupId?: string
    }
    if (!body.contactId || !users.some((user) => user.id === body.contactId)) {
      return new HttpResponse("contact not found", { status: 404 })
    }
    if (body.contactId === currentUser.id) {
      return new HttpResponse("can't add yourself to your network", {
        status: 400,
      })
    }
    if (
      connections.some(
        (connection) =>
          connection.userId === currentUser.id &&
          connection.contactId === body.contactId,
      )
    ) {
      return new HttpResponse("connection already exists", { status: 409 })
    }
    const created: MockConnection = {
      userId: currentUser.id,
      contactId: body.contactId,
      createdAt: new Date().toISOString(),
      isFavorite: false,
      groupId: body.groupId,
    }
    connections = [...connections, created]
    return HttpResponse.json(serializeConnection(created))
  }),

  // Mirrors GET /notifications: returns a page of the pre-visit read state
  // (NOTIFICATIONS_PAGE_SIZE per page, ?page= query param, 1-indexed),
  // then marks everything read as a side effect regardless of which page was
  // requested — the badge/unread count only reflects notifications raised
  // since the last visit to this screen.
  http.get("/api/notifications", ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("page")) || 1
    const totalCount = notifications.length
    const totalPages = Math.max(1, Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE))
    const start = (page - 1) * NOTIFICATIONS_PAGE_SIZE
    const pageItems = notifications
      .slice(start, start + NOTIFICATIONS_PAGE_SIZE)
      .map((notification) => ({ ...notification }))
    notifications = notifications.map((notification) =>
      notification.isRead ? notification : { ...notification, isRead: true },
    )
    return HttpResponse.json({
      notifications: pageItems,
      page,
      pageSize: NOTIFICATIONS_PAGE_SIZE,
      totalCount,
      totalPages,
    })
  }),

  http.get("/api/notifications/unread-count", () => {
    const count = notifications.filter((notification) => !notification.isRead).length
    return HttpResponse.json({ count })
  }),

  // Fixed dummy value — real content doesn't matter for exercising the
  // subscribe flow against a mock PushManager in tests/dev:mock. Length is
  // chosen so it round-trips through base64url→base64 padding correctly
  // (real VAPID keys are 87 base64url chars for the same reason).
  http.get("/api/push-subscriptions/vapid-public-key", () => {
    return HttpResponse.json({ publicKey: "mock-vapid-public-key000" })
  }),

  http.post("/api/push-subscriptions", async ({ request }) => {
    const body = (await request.json()) as { endpoint?: string; p256dh?: string; auth?: string }
    if (!body.endpoint || !body.p256dh || !body.auth) {
      return new HttpResponse("endpoint, p256dh and auth are all required", { status: 400 })
    }
    const existing = pushSubscriptions.find((sub) => sub.endpoint === body.endpoint)
    const created = {
      id: existing?.id ?? crypto.randomUUID(),
      userId: currentUser.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    pushSubscriptions = [...pushSubscriptions.filter((sub) => sub.endpoint !== body.endpoint), created]
    return HttpResponse.json(created)
  }),

  http.delete("/api/push-subscriptions", async ({ request }) => {
    const body = (await request.json()) as { endpoint?: string }
    const index = pushSubscriptions.findIndex(
      (sub) => sub.userId === currentUser.id && sub.endpoint === body.endpoint,
    )
    if (index === -1) {
      return new HttpResponse("push subscription not found", { status: 404 })
    }
    pushSubscriptions = pushSubscriptions.filter((_, i) => i !== index)
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch("/api/network/:contactId", async ({ request, params }) => {
    const index = connections.findIndex(
      (connection) =>
        connection.userId === currentUser.id &&
        connection.contactId === params.contactId,
    )
    if (index === -1) {
      return new HttpResponse("connection not found", { status: 404 })
    }
    const body = (await request.json()) as {
      groupId?: string
      isFavorite?: boolean
    }
    const updated = { ...connections[index] }
    if (body.groupId !== undefined) {
      updated.groupId = body.groupId === "" ? undefined : body.groupId
    }
    if (body.isFavorite !== undefined) {
      updated.isFavorite = body.isFavorite
    }
    connections[index] = updated
    return HttpResponse.json(serializeConnection(updated))
  }),

  http.delete("/api/network/:contactId", ({ params }) => {
    const index = connections.findIndex(
      (connection) =>
        connection.userId === currentUser.id &&
        connection.contactId === params.contactId,
    )
    if (index === -1) {
      return new HttpResponse("connection not found", { status: 404 })
    }
    connections = connections.filter((_, i) => i !== index)
    return new HttpResponse(null, { status: 204 })
  }),
]
