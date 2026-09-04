-- Explicit Croatian fiscal settings required by the current Porezna F1 schema.
-- USustPdv must be configured explicitly; never infer VAT-system membership
-- from the default VAT rate.

alter table public.company_fiscal_settings
  add column if not exists vat_registered boolean not null default false,
  add column if not exists sequence_scope text not null default 'P';

alter table public.company_fiscal_settings
  drop constraint if exists company_fiscal_settings_sequence_scope_check;

alter table public.company_fiscal_settings
  add constraint company_fiscal_settings_sequence_scope_check
  check (sequence_scope in ('P', 'N'));

alter table public.invoice_fiscalization
  add column if not exists fiscal_sequence_number bigint,
  add column if not exists fiscal_invoice_number text,
  add column if not exists payment_code text,
  add column if not exists request_message_id uuid;

alter table public.invoice_fiscalization
  drop constraint if exists invoice_fiscalization_payment_code_check;

alter table public.invoice_fiscalization
  add constraint invoice_fiscalization_payment_code_check
  check (payment_code is null or payment_code in ('G', 'K', 'T', 'O'));

comment on column public.company_fiscal_settings.vat_registered is
  'Whether the Croatian fiscalization taxpayer is in the VAT system (USustPdv). Must be explicitly configured, never inferred from VAT rate.';

comment on column public.company_fiscal_settings.sequence_scope is
  'Croatian fiscal invoice numbering scope: P=business premise, N=device.';

comment on column public.invoice_fiscalization.fiscal_sequence_number is
  'Numeric BrOznRac reserved for a Croatian F1 fiscal invoice. No leading zero representation.';

comment on column public.invoice_fiscalization.fiscal_invoice_number is
  'Human-readable fiscal number composed from BrOznRac/OznPosPr/OznNapUr after reservation.';
