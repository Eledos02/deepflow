export async function requestTimerNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "default") return;

  try {
    await window.Notification.requestPermission();
  } catch {
    // Notification support varies by browser and browsing context.
  }
}

export function showTimerCompletionNotification(
  durationSeconds: number,
  intention?: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;

  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  try {
    new window.Notification(`${minutes} minute timer complete`, {
      body: intention?.trim()
        ? `Finished: ${intention.trim()}`
        : "Your DeepFlow session is complete.",
      icon: "/deepflow-icon-192.png",
      tag: "deepflow-timer-complete",
    });
  } catch {
    // Some mobile browsers only support notifications through service workers.
  }
}
