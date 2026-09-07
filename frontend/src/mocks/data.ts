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
]
