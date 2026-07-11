export function getTimerDisplayClassName(formattedDuration: string) {
  return formattedDuration.length > 5
    ? "timer-display timer-display--compact"
    : "timer-display";
}
