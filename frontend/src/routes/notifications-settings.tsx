import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

import { Switch } from "@/components/ui/switch"
import { isPushSupported, urlBase64ToUint8Array } from "@/lib/push"

type Status = "loading" | "enabled" | "disabled" | "unsupported"

async function fetchExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

function NotificationsSettings() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>("loading")
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported")
      return
    }
    let cancelled = false
    fetchExistingSubscription()
      .then((subscription) => {
        if (!cancelled) setStatus(subscription ? "enabled" : "disabled")
      })
      .catch(() => {
        if (!cancelled) setStatus("disabled")
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleEnable() {
    setIsToggling(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setError("Notification permission was not granted.")
        return
      }

      const keyResponse = await fetch("/api/push-subscriptions/vapid-public-key", {
        credentials: "include",
      })
      if (!keyResponse.ok) {
        throw new Error("failed to fetch VAPID public key")
      }
      const { publicKey } = (await keyResponse.json()) as { publicKey: string }
      if (!publicKey) {
        setError("Push notifications aren't configured on the server yet.")
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = subscription.toJSON()

      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })
      if (!response.ok) {
        throw new Error("failed to register subscription")
      }
      setStatus("enabled")
    } catch {
      setError("Couldn't enable push notifications. Please try again.")
    } finally {
      setIsToggling(false)
    }
  }

  async function handleDisable() {
    setIsToggling(true)
    setError(null)
    try {
      const subscription = await fetchExistingSubscription()
      if (subscription) {
        await fetch("/api/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus("disabled")
    } catch {
      setError("Couldn't disable push notifications. Please try again.")
    } finally {
      setIsToggling(false)
    }
  }

  function handleToggle(checked: boolean) {
    if (checked) {
      handleEnable()
    } else {
      handleDisable()
    }
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-6 font-body">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-joyna-border text-joyna-ink-soft"
          aria-label="Back to profile"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" strokeWidth={2} />
        </button>
        <h1 className="font-display text-xl font-semibold text-joyna-ink">Notification settings</h1>
      </div>

      {status === "unsupported" ? (
        <p className="text-sm text-joyna-ink-faint">
          Push notifications aren&apos;t supported in this browser.
        </p>
      ) : (
        <div className="flex items-center justify-between rounded-card border border-joyna-border bg-white px-4 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-medium text-joyna-ink">Enable push notifications</p>
            <p className="mt-0.5 text-xs text-joyna-ink-faint">
              Get notified on this device about invites, RSVPs and event updates.
            </p>
          </div>
          <Switch
            checked={status === "enabled"}
            disabled={status === "loading" || isToggling}
            onCheckedChange={handleToggle}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}
    </section>
  )
}

export default NotificationsSettings
