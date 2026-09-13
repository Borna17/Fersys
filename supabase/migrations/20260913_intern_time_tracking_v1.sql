create table if not exists public.interns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  school_name text,
  program_name text,
  start_date date,
  end_date date,
  target_hours numeric(7,2),
  notes text,
  is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interns_full_name_not_blank check (length(trim(full_name)) >= 2),
  constraint interns_target_hours_nonnegative check (target_hours is null or target_hours >= 0)
);

create table if not exists public.intern_time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  intern_id uuid not null references public.interns(id) on delete cascade,
  work_date date not null,
  hours numeric(5,2) not null,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intern_time_entries_hours_positive check (hours > 0 and hours <= 24),
  constraint intern_time_entries_unique_day unique (intern_id, work_date)
);

create index if not exists interns_company_id_idx on public.interns(company_id);
create index if not exists interns_company_active_idx on public.interns(company_id, is_active);
create index if not exists intern_time_entries_company_id_idx on public.intern_time_entries(company_id);
create index if not exists intern_time_entries_intern_date_idx on public.intern_time_entries(intern_id, work_date desc);

alter table public.interns enable row level security;
alter table public.intern_time_entries enable row level security;

drop policy if exists interns_select_company_members on public.interns;
create policy interns_select_company_members on public.interns
for select using (public.is_company_member(company_id));

drop policy if exists interns_insert_company_managers on public.interns;
create policy interns_insert_company_managers on public.interns
for insert with check (
  company_id = public.current_company_id()
  and public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
);

drop policy if exists interns_update_company_managers on public.interns;
create policy interns_update_company_managers on public.interns
for update using (
  public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
) with check (
  company_id = public.current_company_id()
  and public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
);

drop policy if exists interns_delete_company_managers on public.interns;
create policy interns_delete_company_managers on public.interns
for delete using (
  public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
);

drop policy if exists intern_entries_select_company_members on public.intern_time_entries;
create policy intern_entries_select_company_members on public.intern_time_entries
for select using (public.is_company_member(company_id));

drop policy if exists intern_entries_insert_company_managers on public.intern_time_entries;
create policy intern_entries_insert_company_managers on public.intern_time_entries
for insert with check (
  company_id = public.current_company_id()
  and public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
  and exists (
    select 1 from public.interns i
    where i.id = intern_id and i.company_id = company_id
  )
);

drop policy if exists intern_entries_update_company_managers on public.intern_time_entries;
create policy intern_entries_update_company_managers on public.intern_time_entries
for update using (
  public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
) with check (
  company_id = public.current_company_id()
  and public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
  and exists (
    select 1 from public.interns i
    where i.id = intern_id and i.company_id = company_id
  )
);

drop policy if exists intern_entries_delete_company_managers on public.intern_time_entries;
create policy intern_entries_delete_company_managers on public.intern_time_entries
for delete using (
  public.has_company_role(company_id, array['owner','admin','manager']::public.company_role[])
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists interns_set_updated_at on public.interns;
create trigger interns_set_updated_at
before update on public.interns
for each row execute function public.set_updated_at();

drop trigger if exists intern_time_entries_set_updated_at on public.intern_time_entries;
create trigger intern_time_entries_set_updated_at
before update on public.intern_time_entries
for each row execute function public.set_updated_at();
