-- HR fiscalization gateway audit foundation.
-- Keeps only sanitized request/response snapshots. Never store certificates,
-- private keys, certificate PINs/passwords, or other secrets in these columns.

alter table public.invoice_fiscalization
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists request_payload jsonb not null default '{}'::jsonb,
  add column if not exists response_payload jsonb not null default '{}'::jsonb,
  add column if not exists adapter_version text not null default '',
  add column if not exists environment text;

alter table public.invoice_fiscalization
  drop constraint if exists invoice_fiscalization_environment_check;

alter table public.invoice_fiscalization
  add constraint invoice_fiscalization_environment_check
  check (environment is null or environment in ('TEST', 'LIVE'));

comment on column public.invoice_fiscalization.request_payload is
  'Sanitized fiscal request snapshot. Never store certificates, private keys, PINs or passwords.';

comment on column public.invoice_fiscalization.response_payload is
  'Sanitized fiscal provider response snapshot. Never store secrets.';

comment on column public.invoice_fiscalization.adapter_version is
  'Server fiscal adapter version used for the latest attempt.';
