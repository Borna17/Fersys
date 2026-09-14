create table if not exists public.workforce_people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  membership_id uuid null references public.company_members(id) on delete set null,
  full_name text not null,
  employee_code text null,
  employment_type text not null default 'employee' check (employment_type in ('employee','contractor','temporary','other')),
  hourly_rate numeric(12,2) null check (hourly_rate is null or hourly_rate >= 0),
  monthly_salary numeric(12,2) null check (monthly_salary is null or monthly_salary >= 0),
  target_monthly_hours numeric(8,2) null check (target_monthly_hours is null or target_monthly_hours >= 0),
  note text null,
  is_active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists workforce_people_company_membership_uidx on public.workforce_people(company_id, membership_id) where membership_id is not null;
create index if not exists workforce_people_company_active_idx on public.workforce_people(company_id, is_active, full_name);

create table if not exists public.employee_time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  worker_id uuid not null references public.workforce_people(id) on delete cascade,
  work_order_id uuid null references public.work_orders(id) on delete set null,
  work_date date not null,
  start_time time null,
  end_time time null,
  break_minutes integer not null default 0 check (break_minutes >= 0 and break_minutes <= 1440),
  regular_hours numeric(7,2) not null default 0 check (regular_hours >= 0 and regular_hours <= 24),
  overtime_hours numeric(7,2) not null default 0 check (overtime_hours >= 0 and overtime_hours <= 24),
  night_hours numeric(7,2) not null default 0 check (night_hours >= 0 and night_hours <= 24),
  sunday_hours numeric(7,2) not null default 0 check (sunday_hours >= 0 and sunday_hours <= 24),
  holiday_hours numeric(7,2) not null default 0 check (holiday_hours >= 0 and holiday_hours <= 24),
  vacation_hours numeric(7,2) not null default 0 check (vacation_hours >= 0 and vacation_hours <= 24),
  sick_leave_hours numeric(7,2) not null default 0 check (sick_leave_hours >= 0 and sick_leave_hours <= 24),
  paid_leave_hours numeric(7,2) not null default 0 check (paid_leave_hours >= 0 and paid_leave_hours <= 24),
  travel_hours numeric(7,2) not null default 0 check (travel_hours >= 0 and travel_hours <= 24),
  note text null,
  source text not null default 'manual' check (source in ('manual','ai','work_order','timer','import')),
  source_ref text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists employee_time_entries_company_date_idx on public.employee_time_entries(company_id, work_date desc);
create index if not exists employee_time_entries_worker_date_idx on public.employee_time_entries(worker_id, work_date desc);
create unique index if not exists employee_time_entries_source_ref_uidx on public.employee_time_entries(company_id, worker_id, source, source_ref) where source_ref is not null;

alter table public.workforce_people enable row level security;
alter table public.employee_time_entries enable row level security;

drop policy if exists workforce_people_select_company on public.workforce_people;
create policy workforce_people_select_company on public.workforce_people for select to authenticated using (company_id = public.current_company_id());
drop policy if exists workforce_people_manage_company on public.workforce_people;
create policy workforce_people_manage_company on public.workforce_people for all to authenticated
using (company_id = public.current_company_id() and exists (select 1 from public.company_members cm where cm.company_id = workforce_people.company_id and cm.user_id = auth.uid() and cm.status = 'active' and cm.role in ('owner','admin','manager')))
with check (company_id = public.current_company_id() and exists (select 1 from public.company_members cm where cm.company_id = workforce_people.company_id and cm.user_id = auth.uid() and cm.status = 'active' and cm.role in ('owner','admin','manager')));

drop policy if exists employee_time_entries_select_company on public.employee_time_entries;
create policy employee_time_entries_select_company on public.employee_time_entries for select to authenticated using (company_id = public.current_company_id());
drop policy if exists employee_time_entries_manage_company on public.employee_time_entries;
create policy employee_time_entries_manage_company on public.employee_time_entries for all to authenticated
using (company_id = public.current_company_id() and exists (select 1 from public.company_members cm where cm.company_id = employee_time_entries.company_id and cm.user_id = auth.uid() and cm.status = 'active' and cm.role in ('owner','admin','manager')))
with check (company_id = public.current_company_id() and exists (select 1 from public.company_members cm where cm.company_id = employee_time_entries.company_id and cm.user_id = auth.uid() and cm.status = 'active' and cm.role in ('owner','admin','manager')));

drop trigger if exists workforce_people_set_updated_at on public.workforce_people;
create trigger workforce_people_set_updated_at before update on public.workforce_people for each row execute function public.set_updated_at();
drop trigger if exists employee_time_entries_set_updated_at on public.employee_time_entries;
create trigger employee_time_entries_set_updated_at before update on public.employee_time_entries for each row execute function public.set_updated_at();
