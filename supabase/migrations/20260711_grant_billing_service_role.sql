grant select, insert, update
on table public.billing_customers
to service_role;

grant select, insert, update
on table public.billing_subscriptions
to service_role;

grant select, insert, update
on table public.billing_events
to service_role;
