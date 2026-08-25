import { Navigate } from "react-router"
import type { ReactNode } from "react"

import { useAuth } from "../auth-context"

function RequireGuest({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RequireGuest
