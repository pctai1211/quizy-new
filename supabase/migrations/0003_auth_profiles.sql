-- ============================================================
-- QUIZY - AUTH PROFILE SYNC
-- ============================================================

-- ============================================================
-- FUNCTION: HANDLE NEW AUTH USER
--
-- Every new Supabase Auth user will automatically get:
--
-- auth.users
--      ↓
-- profiles
--      ↓
-- students
--
-- New users are STUDENTS by default.
-- Admin users will be promoted manually.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  -- Create profile
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'student'
  )
  on conflict (id) do nothing;

  -- Create student record
  insert into public.students (
    id
  )
  values (
    new.id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ============================================================
-- TRIGGER
-- ============================================================

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();