-- FERSYS: incoming_invoices RLS mora biti vezan uz aktivno članstvo u tvrtki,
-- a ne uz korisnika koji je izvorno kreirao račun.
-- To omogućuje da dva administratora iste tvrtke vide i uređuju isti račun.

alter table if exists public.incoming_invoices
  enable row level security;

-- Ukloni stare politike jer njihov naziv i pravila mogu potjecati iz ranijih verzija.
do $$
declare
  policy_row record;
begin
  if to_regclass('public.incoming_invoices') is null then
    return;
  end if;

  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'incoming_invoices'
  loop
    execute format(
      'drop policy if exists %I on public.incoming_invoices',
      policy_row.policyname
    );
  end loop;
end
$$;

-- Član tvrtke smije pristupiti samo računima svoje aktivne tvrtke.
create policy incoming_invoices_select_company
on public.incoming_invoices
for select
to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = incoming_invoices.company_id
      and cm.user_id = auth.uid()
      and cm.status::text = 'active'
  )
);

create policy incoming_invoices_insert_company
on public.incoming_invoices
for insert
to authenticated
with check (
  public.is_platform_admin()
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = incoming_invoices.company_id
      and cm.user_id = auth.uid()
      and cm.status::text = 'active'
  )
);

create policy incoming_invoices_update_company
on public.incoming_invoices
for update
to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = incoming_invoices.company_id
      and cm.user_id = auth.uid()
      and cm.status::text = 'active'
  )
)
with check (
  public.is_platform_admin()
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = incoming_invoices.company_id
      and cm.user_id = auth.uid()
      and cm.status::text = 'active'
  )
);

create policy incoming_invoices_delete_company
on public.incoming_invoices
for delete
to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = incoming_invoices.company_id
      and cm.user_id = auth.uid()
      and cm.status::text = 'active'
  )
);

grant select, insert, update, delete
on table public.incoming_invoices
to authenticated;
