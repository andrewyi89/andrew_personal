create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  layout jsonb not null,
  created_by text,
  created_at timestamptz default now()
);
-- RLS on with no policies: only the server (service role key) can touch it.
alter table boards enable row level security;
