-- Paste this into Supabase dashboard -> SQL Editor -> Run

create table if not exists example (
  id bigint generated always as identity primary key,
  title text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS so the public anon key can't touch this table.
-- The backend uses the secret key, which bypasses RLS.
alter table example enable row level security;

-- This grant allows the backend to read and write to the table.
grant select, insert, update, delete on table public.example to service_role;
