import { createBrowserRouter } from 'react-router'

import RootLayout from './routes/root-layout'
import RootIndex from './routes/root-index'
import Login from './routes/login'
import Register from './routes/register'
import Events from './routes/events'
import EventDetail from './routes/event-detail'
import RequireAuth from './routes/require-auth'
import RequireGuest from './routes/require-guest'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <RootIndex /> },
      {
        path: 'events',
        element: (
          <RequireAuth>
            <Events />
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
