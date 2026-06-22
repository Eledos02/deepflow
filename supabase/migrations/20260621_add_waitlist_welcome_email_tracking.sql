alter table public.waitlist
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists welcome_email_error text;
