# V7.1 Cloud Sync Boundary

V7.0 accounts establish identity only. Existing local data remains on the current device and is neither deleted nor migrated automatically on signup or logout.

V7.1 can add user-owned sync for completed sessions, Focus Journal entries, routines, goals, notes, Notes Canvas connections, and the analytics source data built from those records. Each new table must use `auth.uid()` RLS policies and retain a clear local-first fallback.
