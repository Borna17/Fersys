create table if not exists public.company_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete set null,
  company_name_snapshot text not null,
  company_oib_snapshot text not null default '',
  owner_id uuid null,
  owner_email text not null,
  initiated_by uuid not null,
  admin_reason text not null default '',
  status text not null default 'pending_owner_response' check (status in (
    'pending_owner_response',
    'owner_requested_keep',
    'kept',
    'cancelled',
    'deleted',
    'failed'
  )),
  token_hash text not null unique,
  scheduled_delete_at timestamptz null,
  paused_at timestamptz null,
  owner_response_at timestamptz null,
  owner_reason text null,
  admin_decision_at timestamptz null,
  admin_decision_by uuid null,
  reminder_7_sent_at timestamptz null,
  reminder_3_sent_at timestamptz null,
  reminder_1_sent_at timestamptz null,
  deleted_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_deletion_requests_company_idx
  on public.company_deletion_requests(company_id, created_at desc);

create index if not exists company_deletion_requests_due_idx
  on public.company_deletion_requests(status, scheduled_delete_at)
  where status = 'pending_owner_response';

create unique index if not exists company_deletion_requests_one_active_company_idx
  on public.company_deletion_requests(company_id)
  where company_id is not null and status in ('pending_owner_response', 'owner_requested_keep');

alter table public.company_deletion_requests enable row level security;
revoke all on table public.company_deletion_requests from anon, authenticated;
grant all on table public.company_deletion_requests to service_role;

comment on table public.company_deletion_requests is
  'FERSYS 15-day company deletion grace-period workflow. Access is server-side only.';
