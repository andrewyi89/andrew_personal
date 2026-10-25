create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  layout jsonb not null,
  created_by text,
  created_at timestamptz default now()
);
-- RLS on with no policies: only the server (service role key) can touch it.
alter table boards enable row level security;

-- World Series integration (run this part if you already ran the file above)
create table if not exists integrations (
  id text primary key,
  enabled boolean not null default false,
  state jsonb not null default '{}'
);
alter table integrations enable row level security;
insert into integrations (id) values ('worldseries') on conflict do nothing;
