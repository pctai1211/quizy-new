-- QUIZY students table
-- Students are imported by admins from a CSV (name, email, batch) and log
-- in with just their email — no password, no Supabase Auth user. Login is
-- therefore a plain lookup against this table done with the service-role
-- client (see lib/actions/student-auth.ts), and the resulting session is a
-- signed cookie, not a Supabase Auth session.
--
-- Email is stored lowercased/trimmed everywhere it's written so the unique
-- constraint and the login lookup both do a simple, case-insensitive match.

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  batch_name text not null,
  created_at timestamptz default now()
);

create index if not exists students_batch_name_idx on students(batch_name);

alter table students enable row level security;

-- Only admins (via the authenticated Supabase session used in /admin) can
-- read or manage this table directly. The student login route bypasses
-- RLS entirely with the service-role key, same rationale as submissions/
-- answers in 0002_rls.sql.
create policy "Admins can view students"
  on students for select
  to authenticated
  using (true);

create policy "Admins can insert students"
  on students for insert
  to authenticated
  with check (true);

create policy "Admins can update students"
  on students for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete students"
  on students for delete
  to authenticated
  using (true);
