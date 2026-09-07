import { Button } from '@/components/ui/button'

import { useAuth } from '../auth-context'

function Profile() {
  const { user, logout } = useAuth()

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    logout()
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-muted-foreground">{user?.name}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={handleLogout}
      >
        Log out
      </Button>
    </section>
  )
}

export default Profile
