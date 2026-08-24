import { http, HttpResponse } from "msw"

import {
  MOCK_PASSWORD,
  mockEvents,
  mockGroups,
  mockUsers,
  type MockEvent,
  type MockGroup,
} from "./data"

// Mutable in-memory copies so writes made during a session don't leak
// between page reloads or affect the fixtures other handlers read from.
let events = [...mockEvents]
let groups = [...mockGroups]
const currentUser = mockUsers[0]

export const handlers = [
  http.post("/auth/register", async ({ request }) => {
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

  http.post("/auth/login", async ({ request }) => {
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

  http.post("/auth/logout", () => new HttpResponse(null, { status: 204 })),

  http.get("/events", () => HttpResponse.json(events)),

  http.post("/events", async ({ request }) => {
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

  http.patch("/events/:id", async ({ request, params }) => {
    const index = events.findIndex((event) => event.id === params.id)
    if (index === -1) {
      return new HttpResponse("event not found", { status: 404 })
    }
    const body = (await request.json()) as Partial<MockEvent>
    events[index] = { ...events[index], ...body }
    return HttpResponse.json(events[index])
  }),

  http.delete("/events/:id", ({ params }) => {
    if (!events.some((event) => event.id === params.id)) {
      return new HttpResponse("event not found", { status: 404 })
    }
    events = events.filter((event) => event.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post("/events/invites", async ({ request }) => {
    const body = (await request.json()) as {
      eventId?: string
      invitedUserId?: string
      spreadAllowed?: number
    }
    if (!body.eventId || !events.some((event) => event.id === body.eventId)) {
      return new HttpResponse("event not found", { status: 404 })
    }
    return HttpResponse.json({
      eventId: body.eventId,
      invitedBy: currentUser.id,
      invitedUserId: body.invitedUserId,
      status: "pending",
      spreadAllowed: body.spreadAllowed ?? 0,
      createdAt: new Date().toISOString(),
    })
  }),

  http.post("/groups", async ({ request }) => {
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

  http.patch("/groups/:id", async ({ request, params }) => {
    const index = groups.findIndex((group) => group.id === params.id)
    if (index === -1) {
      return new HttpResponse("group not found", { status: 404 })
    }
    const body = (await request.json()) as Partial<MockGroup>
    groups[index] = { ...groups[index], ...body }
    return HttpResponse.json(groups[index])
  }),

  http.delete("/groups/:id", ({ params }) => {
    if (!groups.some((group) => group.id === params.id)) {
      return new HttpResponse("group not found", { status: 404 })
    }
    groups = groups.filter((group) => group.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
