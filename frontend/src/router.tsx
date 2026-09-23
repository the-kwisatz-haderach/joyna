import {createBrowserRouter} from 'react-router'

import RootLayout from './routes/root-layout'
import Login from './routes/login'
import Register from './routes/register'
import Events from './routes/events'
import AllEvents from './routes/events-all'
import EventDetail from './routes/event-detail'
import NewEvent from './routes/new-event'
import CreateEvent from './routes/create-event'
import EditEvent from './routes/edit-event'
import ManageTemplates from './routes/manage-templates'
import TemplateForm from './routes/template-form'
import RequireAuth from './routes/require-auth'
import RequireGuest from './routes/require-guest'
import Network from './routes/network'
import NetworkAdd from './routes/network-add'
import NetworkManage from './routes/network-manage'
import NetworkProfile from './routes/network-profile'
import Notifications from './routes/notifications'
import Profile from './routes/profile'
import EditProfile from './routes/edit-profile'
import NotificationsSettings from './routes/notifications-settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <Events />
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
        path: 'events/all',
        element: (
          <RequireAuth>
            <AllEvents />
          </RequireAuth>
        ),
      },
      {
        path: 'events/new',
        element: (
          <RequireAuth>
            <NewEvent />
          </RequireAuth>
        ),
      },
      {
        path: 'events/new/blank',
        element: (
          <RequireAuth>
            <CreateEvent />
          </RequireAuth>
        ),
      },
      {
        path: 'events/templates',
        element: (
          <RequireAuth>
            <ManageTemplates />
          </RequireAuth>
        ),
      },
      {
        path: 'events/templates/new',
        element: (
          <RequireAuth>
            <TemplateForm />
          </RequireAuth>
        ),
      },
      {
        path: 'events/templates/:id',
        element: (
          <RequireAuth>
            <TemplateForm />
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
        path: 'events/:id/edit',
        element: (
          <RequireAuth>
            <EditEvent />
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
        path: 'network/add',
        element: (
          <RequireAuth>
            <NetworkAdd />
          </RequireAuth>
        ),
      },
      {
        path: 'network/manage',
        element: (
          <RequireAuth>
            <NetworkManage />
          </RequireAuth>
        ),
      },
      {
        path: 'network/:contactId',
        element: (
          <RequireAuth>
            <NetworkProfile />
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
      {
        path: 'profile/edit',
        element: (
          <RequireAuth>
            <EditProfile />
          </RequireAuth>
        ),
      },
      {
        path: 'profile/notifications',
        element: (
          <RequireAuth>
            <NotificationsSettings />
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
