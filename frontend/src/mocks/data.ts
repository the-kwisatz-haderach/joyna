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
]

export const mockEvents: MockEvent[] = [
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000001',
    ownerId: mockUsers[0].id,
    name: 'Summer Rooftop Party',
    description: 'Drinks and music under the stars.',
    createdAt: '2026-06-01T12:00:00Z',
    date: '2026-08-30T18:00:00Z',
    location: 'Downtown Rooftop, Stockholm',
    rsvpDeadline: '2026-08-25T23:59:59Z',
    type: 'party',
    defaultSpreadAllowed: 2,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000002',
    ownerId: mockUsers[0].id,
    name: 'Board Game Night',
    description: 'Bring your favorite board game.',
    createdAt: '2026-07-15T12:00:00Z',
    date: '2026-09-05T19:00:00Z',
    location: "Ada's place",
    type: 'gathering',
    defaultSpreadAllowed: 1,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000004',
    ownerId: mockUsers[1].id,
    name: 'Turing Award Dinner',
    description: 'Celebrating a milestone in computing.',
    createdAt: '2026-07-20T12:00:00Z',
    date: '2026-09-12T19:00:00Z',
    location: 'The Guild Hall, Cambridge',
    type: 'dinner',
    defaultSpreadAllowed: 0,
  },
  {
    id: 'c1a2b3c4-1111-4a1a-8a1a-000000000003',
    ownerId: mockUsers[0].id,
    name: 'Welcome Mixer',
    description: 'Kickoff mixer for new members.',
    createdAt: '2026-01-05T12:00:00Z',
    date: '2026-01-15T18:00:00Z',
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
