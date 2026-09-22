// Converts a base64url-encoded VAPID public key (as served by
// GET /push-subscriptions/vapid-public-key) into the raw Uint8Array
// pushManager.subscribe() expects as applicationServerKey.
export function urlBase64ToUint8Array(base64UrlKey: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64UrlKey.length % 4)) % 4)
  const base64 = (base64UrlKey + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}
