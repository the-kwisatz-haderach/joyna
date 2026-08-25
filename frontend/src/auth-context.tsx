import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type SessionUser = {
  id: string
  name: string
  email: string
  joinedAt: string
  profilePictureKey?: string
}

type AuthContextValue = {
  user: SessionUser | null
  login: (user: SessionUser) => void
  logout: () => void
}

const STORAGE_KEY = "joyna.currentUser"

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredUser)

  const login = (nextUser: SessionUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
