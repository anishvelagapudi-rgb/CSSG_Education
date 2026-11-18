-- Paste this into Supabase dashboard -> SQL Editor -> Run.
-- A "notes" table where every row belongs to one user.
-- Rename notes/body to fit your project (posts, events, scores...). Keep user_id.

create table if not exists notes (
  id bigint generated always as identity primary key,
  -- auth.uid() = the id inside the logged-in user's token. The database fills it in,
  -- so your code never has to send user_id (and can't fake it).
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1. Lock the table. With RLS on and no policies, NOBODY can read or write it
--    (except the secret key, which skips RLS).
alter table notes enable row level security;

-- 2. Let the API roles talk to the table at all. RLS then decides WHICH rows.
--    anon = not logged in, authenticated = logged in, service_role = secret key.
grant select, insert, update, delete on table public.notes to authenticated;
grant select on table public.notes to anon;
grant select, insert, update, delete on table public.notes to service_role;

-- 3. Policies: the rules. Each one is basically a WHERE clause Postgres adds for you.

-- Read: your own notes, plus anything marked public (logged-out visitors see public ones only).
create policy "read own or public notes" on notes
  for select to anon, authenticated
  using (is_public or auth.uid() = user_id);

-- Create: only rows with YOUR user_id (stops "insert a note as Alice").
create policy "create own notes" on notes
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Edit: only your rows, and you can't hand a row to someone else.
create policy "edit own notes" on notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: only your rows.
create policy "delete own notes" on notes
  for delete to authenticated
  using (auth.uid() = user_id);
