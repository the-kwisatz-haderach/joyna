import { http, HttpResponse } from "msw"

import {
  MOCK_PASSWORD,
  mockConnections,
  mockEventInvites,
  mockEvents,
  mockGroups,
  mockUsers,
  type MockConnection,
  type MockEvent,
  type MockEventInvite,
  type MockGroup,
} from "./data"

// Mutable in-memory copies so writes made during a session don't leak
// between page reloads or affect the fixtures other handlers read from.
let events = [...mockEvents]
let eventInvites = [...mockEventInvites]
let groups = [...mockGroups]
let connections = [...mockConnections]
const currentUser = mockUsers[0]

function serializeConnection(connection: MockConnection) {
  const contact = mockUsers.find((user) => user.id === connection.contactId)
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
  }
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
      const user = mockUsers.find((candidate) => candidate.id === candidateId)
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
    }
    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return new HttpResponse("invalid request body", { status: 400 })
    }
    const email = body.email.trim().toLowerCase()
    if (mockUsers.some((user) => user.email === email)) {
      return new HttpResponse("user already exists with this email", {
        status: 409,
      })
    }
    return HttpResponse.json({
      id: crypto.randomUUID(),
      name: body.name.trim(),
      email,
      joinedAt: new Date().toISOString(),
    })
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }
    const user = mockUsers.find((candidate) => candidate.email === body.email)
    if (!user || body.password !== MOCK_PASSWORD) {
      return new HttpResponse("invalid credentials", { status: 401 })
    }
    return HttpResponse.json(user)
  }),

  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),

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

    return HttpResponse.json(sorted)
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
    }
    events = [...events, created]
    return HttpResponse.json(created)
  }),

  http.patch("/api/events/:id", async ({ request, params }) => {
    const index = events.findIndex((event) => event.id === params.id)
    if (index === -1) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const body = (await request.json()) as Partial<MockEvent>
    events[index] = { ...events[index], ...body }
    return HttpResponse.json(events[index])
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
    })
  }),

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
    const attendees = [...eventAttendees(event.id)].map((userId) => {
      const user = mockUsers.find((candidate) => candidate.id === userId)
      return {
        userId,
        name: user?.name ?? "",
        email: user?.email ?? "",
        isOwner: userId === event.ownerId,
      }
    })
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
    const body = (await request.json()) as { status?: "accepted" | "declined" }
    if (body.status !== "accepted" && body.status !== "declined") {
      return new HttpResponse("status must be 'accepted' or 'declined'", {
        status: 400,
      })
    }
    eventInvites[index] = { ...eventInvites[index], status: body.status }
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

  http.post("/api/network", async ({ request }) => {
    const body = (await request.json()) as {
      contactId?: string
      groupId?: string
    }
    if (!body.contactId || !mockUsers.some((user) => user.id === body.contactId)) {
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
]
