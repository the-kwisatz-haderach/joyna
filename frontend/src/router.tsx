import { createBrowserRouter } from "react-router"

import RootLayout from "./routes/root-layout"
import RootIndex from "./routes/root-index"
import Login from "./routes/login"
import Register from "./routes/register"
import RequireGuest from "./routes/require-guest"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [{ index: true, element: <RootIndex /> }],
  },
  {
    path: "login",
    element: (
      <RequireGuest>
        <Login />
      </RequireGuest>
    ),
  },
  {
    path: "register",
    element: (
      <RequireGuest>
        <Register />
      </RequireGuest>
    ),
  },
])
