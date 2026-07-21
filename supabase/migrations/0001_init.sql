-- QUIZY initial schema
-- Run this migration first in the Supabase SQL editor or via the CLI.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles: admin identities, linked 1:1 to auth.users
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- batches: cohorts / groups of students
-- ─────────────────────────────────────────────────────────────
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- quizzes
-- ─────────────────────────────────────────────────────────────
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  batch_id uuid references batches(id) on delete set null,
  duration_minutes integer not null,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists quizzes_batch_id_idx on quizzes(batch_id);
create index if not exists quizzes_published_idx on quizzes(published);

-- ─────────────────────────────────────────────────────────────
-- questions
-- ─────────────────────────────────────────────────────────────
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('mcq', 'short_answer')),
  correct_answer text not null,
  points integer default 1 check (points > 0),
  sort_order integer not null,
  created_at timestamptz default now()
);

create index if not exists questions_quiz_id_idx on questions(quiz_id);

-- ─────────────────────────────────────────────────────────────
-- question_options: choices for MCQ questions
-- ─────────────────────────────────────────────────────────────
create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  option_text text not null,
  sort_order integer not null
);

create index if not exists question_options_question_id_idx on question_options(question_id);

-- ─────────────────────────────────────────────────────────────
-- submissions: one row per student attempt
-- ─────────────────────────────────────────────────────────────
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  name text not null,
  email text not null,
  batch_name text not null,
  score integer default 0,
  total_points integer default 0,
  percentage numeric default 0,
  submitted_at timestamptz default now()
);

create index if not exists submissions_quiz_id_idx on submissions(quiz_id);
create index if not exists submissions_email_idx on submissions(email);
create index if not exists submissions_batch_name_idx on submissions(batch_name);

-- ─────────────────────────────────────────────────────────────
-- answers: one row per question per submission
-- ─────────────────────────────────────────────────────────────
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  answer text,
  is_correct boolean default false
);

create index if not exists answers_submission_id_idx on answers(submission_id);
create index if not exists answers_question_id_idx on answers(question_id);

-- ─────────────────────────────────────────────────────────────
-- Keep quizzes.updated_at current on edit
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists quizzes_set_updated_at on quizzes;
create trigger quizzes_set_updated_at
  before update on quizzes
  for each row
  execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Auto-create a profile row whenever an admin user is created
-- via Supabase Auth (invite or sign-up).
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
