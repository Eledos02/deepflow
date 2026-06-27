# V7.1 Cloud Sync Boundary

DeepFlow remains local-first. Guests use localStorage only, and authenticated
users continue to read and write local data immediately. Cloud sync is a backup
layer for account-owned focus data, not a blocking dependency.

## Synced in V7.1

- Completed focus sessions
- Focus Journal records, stored in the cloud as `focus_sessions`
- Weekly focus goals
- Saved routines

## Still Local-Only

- Notes Canvas notes
- Mind-map connections
- Canvas viewport, pan, and zoom
- Audio preferences
- Payment, plan, and waitlist data

## Conflict Rules

- `user_id + local_id` identifies the same cloud record.
- Local writes happen first.
- Upserts update matching cloud rows.
- Cloud rows only fill missing local records when the identity is clear.
- Ambiguous conflicts keep the local record.
- Cloud sync failures never block timers, goals, routines, or Workspace use.

## Supabase Tables

The V7.1 migration creates:

- `public.focus_sessions`
- `public.focus_goals`
- `public.focus_routines`

All three tables use `auth.uid() = user_id` RLS policies and grant access only
to `authenticated` users.
