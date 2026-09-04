alter table public.invoice_fiscalization
  add column if not exists fiscal_issued_at timestamptz;

create table if not exists public.hr_fiscal_invoice_sequences (
  company_id uuid not null references public.companies(id) on delete cascade,
  calendar_year integer not null,
  business_premise_code text not null,
  device_sequence_key text not null default '',
  sequence_scope text not null,
  last_number bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, calendar_year, business_premise_code, device_sequence_key, sequence_scope),
  constraint hr_fiscal_invoice_sequences_scope_check check (sequence_scope in ('P', 'N')),
  constraint hr_fiscal_invoice_sequences_last_number_check check (last_number >= 0)
);

alter table public.hr_fiscal_invoice_sequences enable row level security;

create or replace function public.reserve_hr_fiscal_invoice_identity(p_invoice_id uuid)
returns table (
  fiscal_sequence_number bigint,
  fiscal_invoice_number text,
  fiscal_issued_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_country_code text;
  v_operating_mode text;
  v_fiscal_mode text;
  v_premise text;
  v_device text;
  v_scope text;
  v_device_key text;
  v_year integer;
  v_number bigint;
  v_issued_at timestamptz;
  v_existing_number bigint;
  v_existing_display text;
  v_existing_issued_at timestamptz;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then raise exception 'ACTIVE_COMPANY_REQUIRED'; end if;

  if not exists (
    select 1 from public.invoices i
    where i.id = p_invoice_id and i.company_id = v_company_id
  ) then raise exception 'INVOICE_NOT_FOUND'; end if;

  select c.country_code, s.operating_mode, s.fiscal_mode,
         s.business_premise_code, s.device_code, s.sequence_scope
    into v_country_code, v_operating_mode, v_fiscal_mode,
         v_premise, v_device, v_scope
  from public.companies c
  join public.company_fiscal_settings s on s.company_id = c.id
  where c.id = v_company_id;

  if coalesce(v_country_code, '') <> 'HR' then raise exception 'NON_HR_COMPANY'; end if;
  if coalesce(v_operating_mode, '') <> 'BUSINESS' then raise exception 'BUSINESS_MODE_REQUIRED'; end if;
  if coalesce(v_fiscal_mode, 'OFF') = 'OFF' then raise exception 'FISCALIZATION_OFF'; end if;
  if coalesce(v_premise, '') !~ '^[A-Za-z0-9]{1,20}$' then raise exception 'INVALID_BUSINESS_PREMISE_CODE'; end if;
  if coalesce(v_device, '') !~ '^[1-9][0-9]{0,19}$' then raise exception 'INVALID_DEVICE_CODE'; end if;
  if coalesce(v_scope, '') not in ('P', 'N') then raise exception 'INVALID_SEQUENCE_SCOPE'; end if;

  select f.fiscal_sequence_number, f.fiscal_invoice_number, f.fiscal_issued_at
    into v_existing_number, v_existing_display, v_existing_issued_at
  from public.invoice_fiscalization f
  where f.invoice_id = p_invoice_id and f.company_id = v_company_id
  for update;

  if v_existing_number is not null then
    return query select v_existing_number, v_existing_display, v_existing_issued_at;
    return;
  end if;

  if not exists (
    select 1 from public.invoice_fiscalization f
    where f.invoice_id = p_invoice_id
      and f.company_id = v_company_id
      and f.channel = 'F1'
  ) then raise exception 'F1_FISCAL_ROW_REQUIRED'; end if;

  v_issued_at := now();
  v_year := extract(year from timezone('Europe/Zagreb', v_issued_at))::integer;
  v_device_key := case when v_scope = 'N' then v_device else '' end;

  insert into public.hr_fiscal_invoice_sequences (
    company_id, calendar_year, business_premise_code,
    device_sequence_key, sequence_scope, last_number
  ) values (
    v_company_id, v_year, upper(v_premise), v_device_key, v_scope, 0
  ) on conflict do nothing;

  update public.hr_fiscal_invoice_sequences
     set last_number = last_number + 1,
         updated_at = now()
   where company_id = v_company_id
     and calendar_year = v_year
     and business_premise_code = upper(v_premise)
     and device_sequence_key = v_device_key
     and sequence_scope = v_scope
  returning last_number into v_number;

  if v_number is null or v_number <= 0 then raise exception 'FISCAL_SEQUENCE_RESERVATION_FAILED'; end if;

  update public.invoice_fiscalization
     set fiscal_sequence_number = v_number,
         fiscal_invoice_number = v_number::text || '/' || upper(v_premise) || '/' || v_device,
         fiscal_issued_at = v_issued_at,
         updated_at = now()
   where invoice_id = p_invoice_id and company_id = v_company_id
  returning invoice_fiscalization.fiscal_invoice_number into v_existing_display;

  return query select v_number, v_existing_display, v_issued_at;
end;
$$;

revoke all on function public.reserve_hr_fiscal_invoice_identity(uuid) from public;
grant execute on function public.reserve_hr_fiscal_invoice_identity(uuid) to authenticated;

comment on function public.reserve_hr_fiscal_invoice_identity(uuid) is
  'Atomically reserves the official Croatian F1 numeric invoice identity for an authenticated user active company. Repeated calls are idempotent for the same invoice.';
