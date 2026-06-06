export const timers = [
  5,
  10,
  15,
  20,
  25,
  30,
  45,
  50,
  60,
  90,
  120,
] as const;

export type TimerMinutes = (typeof timers)[number];

export function isConfiguredTimer(minutes: number): minutes is TimerMinutes {
  return timers.includes(minutes as TimerMinutes);
}

export function parseTimerMinutes(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const minutes = Number(value);
  return isConfiguredTimer(minutes) ? minutes : null;
}

export function parseLegacyTimerSlug(value: string) {
  const match = /^(\d+)-minute-timer$/.exec(value);
  if (!match) return null;

  const minutes = Number(match[1]);
  return isConfiguredTimer(minutes) ? minutes : null;
}

export function getTimerPath(minutes: number) {
  return `/timer/${minutes}`;
}

export function getRelatedTimerMinutes(
  minutes: TimerMinutes,
  limit = 4,
): TimerMinutes[] {
  const currentIndex = timers.indexOf(minutes);
  const related: TimerMinutes[] = [];

  for (let distance = 1; related.length < limit; distance += 1) {
    const lower = timers[currentIndex - distance];
    const higher = timers[currentIndex + distance];

    if (lower !== undefined) related.push(lower);
    if (related.length < limit && higher !== undefined) related.push(higher);

    if (lower === undefined && higher === undefined) break;
  }

  return related.sort((a, b) => a - b);
}
