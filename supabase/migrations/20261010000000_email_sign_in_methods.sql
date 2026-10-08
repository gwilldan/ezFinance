-- How an email is already registered, so sign-up can tell a person to sign in
-- (or continue with Google) instead of creating a second account.
-- Returns the providers linked to that email, e.g. {email} or {google}; an
-- empty array when the email is free. Only the server (service role) calls it.

create or replace function public.email_sign_in_methods(p_email text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct i.provider order by i.provider), '{}')
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
    and u.deleted_at is null;
$$;

revoke all on function public.email_sign_in_methods(text) from public, anon, authenticated;
grant execute on function public.email_sign_in_methods(text) to service_role;
