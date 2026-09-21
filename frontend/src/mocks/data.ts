export type MockUser = {
  id: string
  name: string
  email: string
  joinedAt: string
  profilePictureKey?: string
}

export type MockEvent = {
  id: string
  ownerId: string
  name: string
  description: string
  createdAt: string
  date: string
  location: string
  rsvpDeadline?: string
  type: string
  defaultSpreadAllowed: number
  mood?: string
}

export type MockGroup = {
  id: string
  ownerId: string
  name: string
  createdAt: string
  isFavorite: boolean
}

export type MockEventInvite = {
  eventId: string
  invitedBy: string
  invitedUserId: string
  status: 'pending' | 'accepted' | 'declined'
  spreadAllowed: number
  createdAt: string
}

export type MockConnection = {
  userId: string
  contactId: string
  createdAt: string
  isFavorite: boolean
  groupId?: string
}

// Password accepted for every mock user when logging in via /auth/login.
export const MOCK_PASSWORD = 'password123'

export const mockUsers: MockUser[] = [
  {
    id: 'b6e2b6d0-8f1a-4e3a-9c2d-111111111111',
    name: 'Ada Lovelace',
    email: 'ada@joyna.dev',
    joinedAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 'b6e2b6d0-8f1a-4e3a-9c2d-222222222222',
    name: 'Alan Turing',
    email: 'alan@joyna.dev',
    joinedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: "b6e2b6d0-8f1a-4e3a-9c2d-333333333333",
    name: "Margaret Hamilton",
    email: "margaret@joyna.dev",
    joinedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "b6e2b6d0-8f1a-4e3a-9c2d-444444444444",
    name: "Hedy Lamarr",
    email: "hedy@joyna.dev",
    joinedAt: "2026-03-18T09:00:00Z",
  },
  {
    id: "b6e2b6d0-8f1a-4e3a-9c2d-555555555555",
    name: "Grace Hopper",
    email: "grace@joyna.dev",
    joinedAt: "2026-04-02T09:00:00Z",
  },
]

// Event/RSVP dates are offsets from "now" (rather than fixed calendar dates)
// so the upcoming/archive split fixtures depend on stays correct as real time
// passes, instead of rotting once a hardcoded date is in the past.
function daysFromNow(offsetDays: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString()
}

export const mockEvents: MockEvent[] = [
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000001',
    ownerId: mockUsers[0].id,
    name: 'Summer Rooftop Party',
    description: 'Drinks and music under the stars.',
    createdAt: daysFromNow(-20),
    date: daysFromNow(30),
    location: 'Downtown Rooftop, Stockholm',
    rsvpDeadline: daysFromNow(25),
    type: 'party',
    defaultSpreadAllowed: 2,
    mood: 'party',
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000002',
    ownerId: mockUsers[0].id,
    name: 'Board Game Night',
    description: 'Bring your favorite board game.',
    createdAt: daysFromNow(-10),
    date: daysFromNow(45),
    location: "Ada's place",
    type: 'gathering',
    defaultSpreadAllowed: 1,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000004',
    ownerId: mockUsers[1].id,
    name: 'Turing Award Dinner',
    description: 'Celebrating a milestone in computing.',
    createdAt: daysFromNow(-5),
    date: daysFromNow(60),
    location: 'The Guild Hall, Cambridge',
    type: 'dinner',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000003',
    ownerId: mockUsers[0].id,
    name: 'Welcome Mixer',
    description: 'Kickoff mixer for new members.',
    createdAt: daysFromNow(-70),
    date: daysFromNow(-60),
    location: 'Community Hall, Stockholm',
    type: 'mixer',
    defaultSpreadAllowed: 1,
  },
  // The remaining fixtures below round out the events list (main /events
  // preview + paginated /events/all): a mix of events Ada hosts vs. is
  // invited to, past vs. upcoming, and with/without an RSVP deadline, so
  // both screens have enough data to demonstrate filtering, month grouping
  // and pagination in mock mode.
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000005',
    ownerId: mockUsers[1].id,
    name: 'Quiz Night',
    description: 'Trivia teams of four, prizes for the winners.',
    createdAt: daysFromNow(-15),
    date: daysFromNow(10),
    location: 'The Library Bar',
    type: 'gathering',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000006',
    ownerId: mockUsers[0].id,
    name: 'Rooftop Movie Night',
    description: 'Bring a blanket, popcorn provided.',
    createdAt: daysFromNow(-8),
    date: daysFromNow(75),
    location: "Ada's rooftop",
    type: 'party',
    defaultSpreadAllowed: 1,
    mood: 'chill',
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000007',
    ownerId: mockUsers[2].id,
    name: 'Book Club Meetup',
    description: "Discussing this month's pick.",
    createdAt: daysFromNow(-3),
    date: daysFromNow(5),
    location: "Margaret's Study",
    type: 'gathering',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000008',
    ownerId: mockUsers[1].id,
    name: 'Team Offsite',
    description: 'Planning next quarter together.',
    createdAt: daysFromNow(-25),
    date: daysFromNow(90),
    location: 'Lakeside Lodge',
    rsvpDeadline: daysFromNow(80),
    type: 'other',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000009',
    ownerId: mockUsers[0].id,
    name: 'Summer BBQ',
    description: 'Burgers, salads and lawn games.',
    createdAt: daysFromNow(-110),
    date: daysFromNow(-100),
    location: 'Backyard',
    type: 'party',
    defaultSpreadAllowed: 2,
    mood: 'party',
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000010',
    ownerId: mockUsers[0].id,
    name: 'Movie Night',
    description: 'Classic sci-fi double feature.',
    createdAt: daysFromNow(-140),
    date: daysFromNow(-130),
    location: "Ada's place",
    type: 'gathering',
    defaultSpreadAllowed: 1,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000011',
    ownerId: mockUsers[3].id,
    name: 'New Year Kickoff',
    description: 'Ringing in the new year together.',
    createdAt: daysFromNow(-40),
    date: daysFromNow(150),
    location: 'Community Hall',
    type: 'party',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000012',
    ownerId: mockUsers[2].id,
    name: 'Coffee Catchup',
    description: 'Long overdue catchup over coffee.',
    createdAt: daysFromNow(-30),
    date: daysFromNow(-20),
    location: 'Café Aroma',
    type: 'other',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000013',
    ownerId: mockUsers[0].id,
    name: 'Charity Gala',
    description: 'Black tie fundraiser for the local shelter.',
    createdAt: daysFromNow(-5),
    date: daysFromNow(200),
    location: 'Grand Hall',
    rsvpDeadline: daysFromNow(190),
    type: 'party',
    defaultSpreadAllowed: 1,
  },
  // RSVP deadline already passed, but the event itself is still upcoming —
  // exercises the "RSVP closed"/locked guest list UI for an invitee.
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000014',
    ownerId: mockUsers[1].id,
    name: 'Winter Gala',
    description: 'Formal gala with dinner and dancing.',
    createdAt: daysFromNow(-50),
    date: daysFromNow(40),
    location: 'Grand Ballroom, Cambridge',
    rsvpDeadline: daysFromNow(-5),
    type: 'party',
    defaultSpreadAllowed: 2,
  },
]

export const mockEventInvites: MockEventInvite[] = [
  {
    eventId: mockEvents[2].id,
    invitedBy: mockUsers[1].id,
    invitedUserId: mockUsers[0].id,
    status: 'pending',
    spreadAllowed: 0,
    createdAt: '2026-07-21T09:00:00Z',
  },
  {
    eventId: mockEvents[0].id,
    invitedBy: mockUsers[0].id,
    invitedUserId: mockUsers[2].id,
    status: "accepted",
    spreadAllowed: 1,
    createdAt: "2026-06-02T09:00:00Z",
  },
  {
    eventId: mockEvents[2].id,
    invitedBy: mockUsers[1].id,
    invitedUserId: mockUsers[3].id,
    status: "pending",
    spreadAllowed: 0,
    createdAt: "2026-07-22T09:00:00Z",
  },
  {
    eventId: mockEvents[4].id, // Quiz Night
    invitedBy: mockUsers[1].id,
    invitedUserId: mockUsers[0].id,
    status: "accepted",
    spreadAllowed: 0,
    createdAt: daysFromNow(-14),
  },
  {
    eventId: mockEvents[6].id, // Book Club Meetup
    invitedBy: mockUsers[2].id,
    invitedUserId: mockUsers[0].id,
    status: "accepted",
    spreadAllowed: 0,
    createdAt: daysFromNow(-2),
  },
  {
    eventId: mockEvents[7].id, // Team Offsite
    invitedBy: mockUsers[1].id,
    invitedUserId: mockUsers[0].id,
    status: "pending",
    spreadAllowed: 0,
    createdAt: daysFromNow(-24),
  },
  {
    eventId: mockEvents[10].id, // New Year Kickoff
    invitedBy: mockUsers[3].id,
    invitedUserId: mockUsers[0].id,
    status: "declined",
    spreadAllowed: 0,
    createdAt: daysFromNow(-39),
  },
  {
    eventId: mockEvents[11].id, // Coffee Catchup
    invitedBy: mockUsers[2].id,
    invitedUserId: mockUsers[0].id,
    status: "accepted",
    spreadAllowed: 0,
    createdAt: daysFromNow(-29),
  },
  {
    eventId: mockEvents[13].id, // Winter Gala — RSVP deadline has passed
    invitedBy: mockUsers[1].id,
    invitedUserId: mockUsers[0].id,
    status: "accepted",
    spreadAllowed: 2,
    createdAt: daysFromNow(-45),
  },
]

export const mockGroups: MockGroup[] = [
  {
    id: 'd1e2f3a4-1111-4a1a-8a1a-000000000001',
    ownerId: mockUsers[0].id,
    name: 'Close Friends',
    createdAt: '2026-01-20T09:00:00Z',
    isFavorite: true,
  },
  {
    id: 'd1e2f3a4-1111-4a1a-8a1a-000000000002',
    ownerId: mockUsers[0].id,
    name: 'Book Club',
    createdAt: '2026-03-05T09:00:00Z',
    isFavorite: false,
  },
]

// Ada's (mockUsers[0]) current network. Connections without a groupId fall
// back to the default "Acquaintances" bucket in the UI.
export const mockConnections: MockConnection[] = [
  {
    userId: mockUsers[0].id,
    contactId: mockUsers[1].id,
    createdAt: "2026-02-20T09:00:00Z",
    isFavorite: true,
    groupId: mockGroups[0].id,
  },
  {
    userId: mockUsers[0].id,
    contactId: mockUsers[4].id,
    createdAt: "2026-04-10T09:00:00Z",
    isFavorite: false,
  },
]

export type MockNotificationType =
  | 'event_invite'
  | 'event_uninvite'
  | 'invite_response'
  | 'event_updated'
  | 'rsvp_deadline_reminder'
  | 'event_starting_today'

// Already shaped like the real GET /notifications response (eventName/
// actorName resolved) rather than raw rows, since the mock handler doesn't
// need to reimplement the backend's join.
export type MockNotification = {
  id: string
  type: MockNotificationType
  eventId?: string
  eventName?: string
  actorId?: string
  actorName?: string
  status?: 'accepted' | 'declined'
  isRead: boolean
  createdAt: string
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

// Notifications for Ada (mockUsers[0], the mock session's currentUser).
export const mockNotifications: MockNotification[] = [
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000001',
    type: 'event_invite',
    eventId: mockEvents[2].id, // Turing Award Dinner
    eventName: mockEvents[2].name,
    actorId: mockUsers[1].id,
    actorName: mockUsers[1].name,
    isRead: false,
    createdAt: hoursAgo(2),
  },
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000007',
    type: 'event_uninvite',
    eventId: mockEvents[3].id,
    eventName: mockEvents[3].name,
    actorId: mockUsers[2].id,
    actorName: mockUsers[2].name,
    isRead: false,
    createdAt: hoursAgo(3),
  },
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000002',
    type: 'invite_response',
    eventId: mockEvents[0].id, // Summer Rooftop Party
    eventName: mockEvents[0].name,
    actorId: mockUsers[2].id,
    actorName: mockUsers[2].name,
    status: 'accepted',
    isRead: false,
    createdAt: hoursAgo(5),
  },
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000003',
    type: 'event_updated',
    eventId: mockEvents[7].id, // Team Offsite
    eventName: mockEvents[7].name,
    isRead: true,
    createdAt: daysFromNow(-1),
  },
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000004',
    type: 'invite_response',
    eventId: mockEvents[5].id, // Rooftop Movie Night
    eventName: mockEvents[5].name,
    actorId: mockUsers[1].id,
    actorName: mockUsers[1].name,
    status: 'declined',
    isRead: true,
    createdAt: daysFromNow(-3),
  },
  // Time-based reminders are raised by the daily notifier job rather than a
  // user action, so they have no actorId/actorName.
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000005',
    type: 'rsvp_deadline_reminder',
    eventId: mockEvents[0].id, // Summer Rooftop Party
    eventName: mockEvents[0].name,
    isRead: false,
    createdAt: hoursAgo(12),
  },
  {
    id: 'e1f2a3b4-1111-4a1a-8a1a-000000000006',
    type: 'event_starting_today',
    eventId: mockEvents[6].id, // Book Club Meetup
    eventName: mockEvents[6].name,
    isRead: false,
    createdAt: hoursAgo(1),
  },
]
