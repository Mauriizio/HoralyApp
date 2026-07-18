import type { Reminder, ReminderTrigger } from "./types"

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported"

export function getPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission as NotificationPermissionState
}

export async function requestPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  const result = await Notification.requestPermission()
  return result as NotificationPermissionState
}

// Compute the ISO datetime when a trigger should fire, given the event's target.
export function computeTriggerTime(reminder: Reminder, trigger: ReminderTrigger): Date | null {
  const target = new Date(reminder.targetDateTime)
  if (Number.isNaN(target.getTime())) return null
  switch (trigger.kind) {
    case "hoursBefore":
      return new Date(target.getTime() - trigger.hours * 60 * 60 * 1000)
    case "dayBefore":
      return new Date(target.getTime() - 24 * 60 * 60 * 1000)
    case "customDateTime": {
      const dt = new Date(trigger.datetime)
      return Number.isNaN(dt.getTime()) ? null : dt
    }
  }
}

// Fire a browser notification. Structured so it can be swapped for a push
// notification backend later (e.g. service worker + web push).
export function fireNotification(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  try {
    new Notification(title, { body, tag })
  } catch (err) {
    console.log("[Horaly] Error al notificar:", err)
  }
}
