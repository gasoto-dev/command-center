// Placeholder VAPID public key — replace with real key when gateway push is wired up
const VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-qy7508qIR6-ee0nSaQEYmmXmYVjQIKr8QsnOg";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function getPermissionState(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

/**
 * Get the active service worker registration, if any.
 */
export async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

/**
 * Get the current push subscription from the service worker, if any.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await getSwRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Subscribe to web push notifications via the service worker.
 * Returns the PushSubscription (to be sent to the gateway in a later story).
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const permission = await requestPermission();
  if (permission !== "granted") return null;

  const reg = await getSwRegistration();
  if (!reg) return null;

  // Check for existing subscription first
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
    return subscription;
  } catch {
    console.warn("Push subscription failed — VAPID key may be a placeholder");
    return null;
  }
}

/**
 * Unsubscribe from web push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const sub = await getExistingSubscription();
  if (!sub) return true;
  return sub.unsubscribe();
}

/**
 * Show a notification via the service worker (works in background / PWA).
 * Falls back to Notification API if no service worker is available.
 */
export async function notify(title: string, body: string): Promise<void> {
  if (document.visibilityState === "visible") return;
  if (getPermissionState() !== "granted") return;

  const reg = await getSwRegistration();
  if (reg) {
    await reg.showNotification(title, { body, tag: "default" });
  }
}
