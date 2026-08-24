import { createBrowserRouter } from "react-router"

import RootLayout from "./routes/root-layout"
import Landing from "./routes/landing"
import Login from "./routes/login"
import Register from "./routes/register"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
    ],
  },
])
