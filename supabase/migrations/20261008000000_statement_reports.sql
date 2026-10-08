-- Statements saved to the cloud by users who choose cloud storage.
-- summary, report and messages are AES-256-GCM ciphertext (see
-- lib/reports/crypto.ts); the database never sees them in the clear.
-- Only the server (service role) touches this table; RLS has no policies.

create table if not exists public.statement_reports (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  generated_at timestamptz not null,
  summary text not null,
  report text not null,
  messages text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists statement_reports_user_generated_idx
  on public.statement_reports (user_id, generated_at desc);

alter table public.statement_reports enable row level security;
