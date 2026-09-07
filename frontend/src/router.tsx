import { createBrowserRouter } from 'react-router'

import RootLayout from './routes/root-layout'
import Home from './routes/home'
import Login from './routes/login'
import Register from './routes/register'
import Events from './routes/events'
import EventDetail from './routes/event-detail'
import CreateEvent from './routes/create-event'
import RequireAuth from './routes/require-auth'
import RequireGuest from './routes/require-guest'
import Network from './routes/network'
import Notifications from './routes/notifications'
import Profile from './routes/profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <Home />
          </RequireAuth>
        ),
      },
      {
        path: 'events',
        element: (
          <RequireAuth>
            <Events />
          </RequireAuth>
        ),
      },
      {
        path: 'events/new',
        element: (
          <RequireAuth>
            <CreateEvent />
          </RequireAuth>
        ),
      },
      {
        path: 'events/:id',
        element: (
          <RequireAuth>
            <EventDetail />
          </RequireAuth>
        ),
      },
      {
        path: 'network',
        element: (
          <RequireAuth>
            <Network />
          </RequireAuth>
        ),
      },
      {
        path: 'notifications',
        element: (
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: 'login',
    element: (
      <RequireGuest>
        <Login />
      </RequireGuest>
    ),
  },
  {
    path: 'register',
    element: (
      <RequireGuest>
        <Register />
      </RequireGuest>
    ),
  },
])
