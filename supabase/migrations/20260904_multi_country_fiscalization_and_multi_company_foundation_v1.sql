begin;

alter table public.companies add column if not exists country_code text;
alter table public.companies add column if not exists tax_id text;
alter table public.customers add column if not exists tax_id text;
alter table public.inventory_items add column if not exists kpd_code text;

update public.companies
set country_code = coalesce(nullif(country_code, ''), case
  when upper(coalesce(country, '')) in ('HR','HRVATSKA','CROATIA') then 'HR'
  when upper(coalesce(country, '')) in ('BA','BIH','BOSNA I HERCEGOVINA','BOSNIA AND HERZEGOVINA') then 'BA'
  when upper(coalesce(country, '')) in ('RS','SRBIJA','SERBIA') then 'RS'
  when upper(coalesce(country, '')) in ('SI','SLOVENIJA','SLOVENIA') then 'SI'
  when upper(coalesce(country, '')) in ('ME','CRNA GORA','MONTENEGRO') then 'ME'
  when upper(coalesce(country, '')) in ('MK','SJEVERNA MAKEDONIJA','NORTH MACEDONIA') then 'MK'
  when upper(coalesce(country, '')) in ('XK','KOSOVO') then 'XK'
  else 'HR'
end),
    tax_id = coalesce(nullif(tax_id, ''), nullif(oib, ''));

update public.customers
set tax_id = coalesce(nullif(tax_id, ''), nullif(oib, ''))
where tax_id is null or tax_id = '';

alter table public.companies alter column country_code set default 'HR';

create table if not exists public.user_company_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_company_id uuid references public.companies(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_company_preferences enable row level security;
drop policy if exists "users_read_own_company_preference" on public.user_company_preferences;
create policy "users_read_own_company_preference" on public.user_company_preferences
for select using (user_id = auth.uid());
drop policy if exists "users_write_own_company_preference" on public.user_company_preferences;
create policy "users_write_own_company_preference" on public.user_company_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.company_fiscal_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  operating_mode text not null default 'BUSINESS' check (operating_mode in ('LEARNING','BUSINESS')),
  fiscal_mode text not null default 'OFF' check (fiscal_mode in ('OFF','TEST','LIVE')),
  provider text not null default '',
  business_premise_code text not null default '',
  device_code text not null default '',
  operator_tax_id text not null default '',
  certificate_configured boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.company_fiscal_settings enable row level security;
drop policy if exists "company_members_read_fiscal_settings" on public.company_fiscal_settings;
create policy "company_members_read_fiscal_settings" on public.company_fiscal_settings
for select using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_fiscal_settings.company_id
      and cm.user_id = auth.uid()
  )
);
drop policy if exists "company_owners_manage_fiscal_settings" on public.company_fiscal_settings;
create policy "company_owners_manage_fiscal_settings" on public.company_fiscal_settings
for all using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_fiscal_settings.company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  )
) with check (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_fiscal_settings.company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  )
);

insert into public.company_fiscal_settings (company_id, operating_mode, fiscal_mode, provider)
select c.id, 'BUSINESS', 'OFF', case when c.country_code = 'HR' then 'CROATIA_TAX_AUTHORITY' else '' end
from public.companies c
on conflict (company_id) do nothing;

create table if not exists public.invoice_fiscalization (
  invoice_id uuid primary key references public.invoices(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  country_code text not null,
  channel text not null default 'NONE',
  status text not null default 'NOT_SUBMITTED'
    check (status in ('NOT_SUBMITTED','READY_FOR_TEST','SUBMITTING','SUBMITTED','FAILED','NOT_APPLICABLE')),
  business_premise_code text not null default '',
  device_code text not null default '',
  operator_tax_id text not null default '',
  jir text,
  zki text,
  external_id text,
  submitted_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoice_fiscalization enable row level security;
drop policy if exists "company_members_read_invoice_fiscalization" on public.invoice_fiscalization;
create policy "company_members_read_invoice_fiscalization" on public.invoice_fiscalization
for select using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = invoice_fiscalization.company_id
      and cm.user_id = auth.uid()
  )
);
drop policy if exists "company_members_manage_invoice_fiscalization" on public.invoice_fiscalization;
create policy "company_members_manage_invoice_fiscalization" on public.invoice_fiscalization
for all using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = invoice_fiscalization.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
) with check (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = invoice_fiscalization.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
);

create or replace function public.current_company_id()
returns uuid
language sql
stable security definer
set search_path to 'public'
as $function$
  with preferred as (
    select p.active_company_id as company_id
    from public.user_company_preferences p
    join public.company_members cm on cm.company_id = p.active_company_id
    where p.user_id = auth.uid()
      and cm.user_id = auth.uid()
      and cm.status = 'active'
    limit 1
  ), fallback as (
    select cm.company_id
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.status = 'active'
    order by case cm.role when 'owner' then 1 when 'admin' then 2 else 3 end, cm.created_at asc
    limit 1
  )
  select company_id from preferred
  union all
  select company_id from fallback where not exists (select 1 from preferred)
  limit 1;
$function$;

create or replace function public.set_active_company(p_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Korisnik nije prijavljen.';
  end if;

  if not exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id = p_company_id
      and cm.status = 'active'
  ) then
    raise exception 'Nemate aktivan pristup odabranoj tvrtki.';
  end if;

  insert into public.user_company_preferences(user_id, active_company_id, updated_at)
  values (auth.uid(), p_company_id, now())
  on conflict (user_id) do update
  set active_company_id = excluded.active_company_id, updated_at = now();

  return p_company_id;
end;
$function$;

create or replace function public.get_my_companies()
returns table(
  company_id uuid,
  company_name text,
  role text,
  status text,
  country_code text,
  country text,
  currency text,
  tax_id text,
  is_active boolean
)
language sql
security definer
set search_path to 'public'
as $function$
  select c.id, c.name, cm.role::text, cm.status::text,
         coalesce(c.country_code,'HR'), c.country, c.currency,
         coalesce(c.tax_id,c.oib,''), c.id = public.current_company_id()
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = auth.uid()
  order by (c.id = public.current_company_id()) desc,
           case cm.role when 'owner' then 1 when 'admin' then 2 else 3 end,
           c.name;
$function$;

create or replace function public.get_current_user_access()
returns table(membership_id uuid, company_id uuid, role text, status text, permissions jsonb)
language sql
security definer
set search_path to 'public','auth'
as $function$
  select cm.id, cm.company_id, cm.role::text, cm.status::text, coalesce(cm.permissions, '{}'::jsonb)
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.company_id = public.current_company_id()
  limit 1;
$function$;

create or replace function public.bootstrap_company_for_current_user()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  current_user_id uuid;
  existing_company_id uuid;
  created_company_id uuid;
  requested_company_name text;
  requested_full_name text;
  requested_tax_id text;
  requested_country_code text;
  requested_country_name text;
  requested_currency text;
  normalized_tax_id text;
  tax_label text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'Korisnik nije prijavljen.'; end if;

  select cm.company_id into existing_company_id
  from public.company_members cm
  where cm.user_id = current_user_id
  order by cm.created_at asc
  limit 1;

  if existing_company_id is not null then return existing_company_id; end if;

  select nullif(trim(raw_user_meta_data ->> 'company_name'), ''),
         nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
         coalesce(nullif(trim(raw_user_meta_data ->> 'company_tax_id'), ''), nullif(trim(raw_user_meta_data ->> 'company_oib'), '')),
         upper(coalesce(nullif(trim(raw_user_meta_data ->> 'company_country_code'), ''), 'HR')),
         nullif(trim(raw_user_meta_data ->> 'company_country'), ''),
         upper(coalesce(nullif(trim(raw_user_meta_data ->> 'company_currency'), ''), 'EUR'))
  into requested_company_name, requested_full_name, requested_tax_id, requested_country_code, requested_country_name, requested_currency
  from auth.users
  where id = current_user_id;

  if requested_company_name is null then raise exception 'Naziv tvrtke nedostaje u korisničkom računu.'; end if;
  if requested_country_code not in ('HR','BA','RS','SI','ME','MK','XK','OTHER') then requested_country_code := 'OTHER'; end if;

  normalized_tax_id := upper(regexp_replace(coalesce(requested_tax_id, ''), '\s+', '', 'g'));

  if requested_country_code = 'HR' then
    tax_label := 'Porezni broj (OIB)';
    if normalized_tax_id !~ '^\d{11}$' then
      raise exception 'Porezni broj (OIB) mora sadržavati točno 11 znamenki.';
    end if;
  else
    tax_label := case requested_country_code
      when 'RS' then 'Porezni broj (PIB)'
      when 'ME' then 'Porezni broj (PIB)'
      when 'BA' then 'Porezni broj (JIB)'
      when 'SI' then 'Porezni broj (davčna številka)'
      when 'MK' then 'Porezni broj (EDB)'
      when 'XK' then 'Porezni broj (fiskalni broj)'
      else 'Porezni broj'
    end;
    if length(normalized_tax_id) < 5 then
      raise exception 'Unesite ispravan porezni identifikator za odabranu državu.';
    end if;
  end if;

  if exists (
    select 1 from public.companies c
    where coalesce(c.country_code,'HR') = requested_country_code
      and upper(regexp_replace(coalesce(c.tax_id,c.oib,''), '\s+', '', 'g')) = normalized_tax_id
  ) then
    raise exception 'Tvrtka ili obrt s ovim poreznim brojem već postoji u FERSYS-u. Zatražite pristup postojećoj tvrtki ili se javite FERSYS podršci.';
  end if;

  insert into public.profiles (id, full_name)
  values (current_user_id, coalesce(requested_full_name, ''))
  on conflict (id) do update
  set full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end,
      updated_at = now();

  insert into public.companies(
    name, owner_id, oib, tax_id, country_code, country, currency,
    verification_status, verification_submitted_at, company_code, profile_settings
  ) values (
    requested_company_name,
    current_user_id,
    case when requested_country_code = 'HR' then normalized_tax_id else null end,
    normalized_tax_id,
    requested_country_code,
    coalesce(requested_country_name, case requested_country_code
      when 'HR' then 'Hrvatska'
      when 'BA' then 'Bosna i Hercegovina'
      when 'RS' then 'Srbija'
      when 'SI' then 'Slovenija'
      when 'ME' then 'Crna Gora'
      when 'MK' then 'Sjeverna Makedonija'
      when 'XK' then 'Kosovo'
      else 'Druga država'
    end),
    requested_currency,
    'pending',
    now(),
    public.generate_fersys_company_code(),
    jsonb_build_object(
      'compliance', jsonb_build_object(
        'schemaVersion',1,
        'operatingMode','BUSINESS',
        'countryCode',requested_country_code,
        'currency',requested_currency,
        'taxIdLabel',tax_label,
        'fiscalization',jsonb_build_object(
          'mode','OFF',
          'provider',case when requested_country_code='HR' then 'CROATIA_TAX_AUTHORITY' else '' end,
          'businessPremiseCode','',
          'deviceCode','',
          'operatorTaxId','',
          'certificateConfigured',false
        )
      )
    )
  ) returning id into created_company_id;

  insert into public.company_members(company_id,user_id,role,status,permissions)
  values(created_company_id,current_user_id,'owner','inactive','{}'::jsonb);

  insert into public.company_fiscal_settings(company_id,operating_mode,fiscal_mode,provider)
  values(created_company_id,'BUSINESS','OFF',case when requested_country_code='HR' then 'CROATIA_TAX_AUTHORITY' else '' end)
  on conflict(company_id) do nothing;

  return created_company_id;
end;
$function$;

commit;
