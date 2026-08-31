alter table public.company_deletion_requests
  add column if not exists response_token text null;

comment on column public.company_deletion_requests.response_token is
  'High-entropy owner response token. Table is service-role only; reserved for secure reminder links.';
