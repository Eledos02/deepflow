# Local Analytics QA

DeepFlow analytics are local-first. Workspace Overview and Insights merge
completed Focus Journal entries with compatible legacy timer history:

- `deepflow:focus-journal:v1` - completed focus sessions and intentions.
- `deepflow:timer-stats:v1` - totals, streaks, and legacy session history.
- `deepflow:completed-sessions:v1` - detailed local Focus History records.

For local QA, clear only these keys in browser DevTools Application > Local
Storage before testing a fresh analytics state. Do not clear them in product
code and do not clear them in a shared browser profile with real sessions.

Completed sessions are the only source for focus patterns. Active, paused, and
reset timers do not contribute. DeepFlow waits for three completed sessions in
the current seven-day window before naming a best focus day or time, and waits
for completed sessions in a prior seven-day window before comparing momentum.
