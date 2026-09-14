drop index if exists public.workforce_people_company_membership_uidx;
create unique index workforce_people_company_membership_uidx
  on public.workforce_people(company_id, membership_id);

drop index if exists public.employee_time_entries_source_ref_uidx;
create unique index employee_time_entries_source_ref_uidx
  on public.employee_time_entries(company_id, worker_id, source, source_ref);
