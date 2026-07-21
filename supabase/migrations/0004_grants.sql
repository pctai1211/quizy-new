-- QUIZY schema/table grants
-- On a normal Supabase project, creating tables via the SQL editor
-- automatically grants schema usage and table privileges to the
-- anon/authenticated/service_role roles. On this project those grants
-- are missing (confirmed via direct query: anon gets "permission denied
-- for table quizzes", service_role gets the more severe "permission
-- denied for schema public"), so every request — including the
-- service-role-powered public quiz/result/submit routes — fails.
--
-- RLS policies (0002_rls.sql) still govern what anon/authenticated can
-- actually see or write; these grants only unlock the schema/table
-- access Postgres checks before RLS is even evaluated. service_role
-- already bypasses RLS by role attribute, but still needs the schema
-- grant to reach the tables at all.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- Make sure future tables/sequences/functions inherit the same grants.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
