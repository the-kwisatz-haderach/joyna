import { Link, Outlet } from "react-router"

import { useAuth } from "../auth-context"

function RootLayout() {
  const { user, logout } = useAuth()

  async function handleLogout() {
    await fetch("/auth/logout", { method: "POST", credentials: "include" })
    logout()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/" className="font-semibold text-foreground">
          joyna
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-foreground hover:text-primary"
            >
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" className="text-foreground hover:text-primary">
                Log in
              </Link>
              <Link
                to="/register"
                className="text-foreground hover:text-primary"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default RootLayout
