create or replace function public.get_current_company_branding()
returns table (
  id uuid,
  name text,
  logo_url text,
  primary_color text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    c.id,
    c.name,
    c.logo_url,
    c.primary_color
  from public.companies c
  where c.id = public.current_company_id()
  limit 1;
$$;

revoke all on function public.get_current_company_branding() from public;
grant execute on function public.get_current_company_branding() to authenticated;
