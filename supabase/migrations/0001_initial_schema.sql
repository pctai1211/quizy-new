-- ============================================================
-- QUIZY - INITIAL DATABASE SCHEMA
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum (
  'admin',
  'student'
);

create type difficulty_level as enum (
  'easy',
  'medium',
  'hard'
);

create type quiz_status as enum (
  'draft',
  'published',
  'archived'
);

create type question_type as enum (
  'single_choice',
  'multiple_choice',
  'short_answer',
  'open_ended'
);

create type assignment_status as enum (
  'assigned',
  'started',
  'completed',
  'cancelled'
);

create type attempt_status as enum (
  'in_progress',
  'submitted',
  'graded',
  'cancelled'
);

-- ============================================================
-- PROFILES
--
-- One record per Supabase Auth user.
-- ============================================================

create table profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  email text not null,

  first_name text,

  last_name text,

  role user_role not null default 'student',

  avatar_url text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index profiles_role_idx
  on profiles(role);

create index profiles_email_idx
  on profiles(email);

-- ============================================================
-- STUDENTS
--
-- Additional student information.
-- Authentication is handled by Supabase Auth.
-- ============================================================

create table students (
  id uuid primary key
    references profiles(id)
    on delete cascade,

  student_code text,

  phone text,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint students_student_code_unique
    unique (student_code)
);

create index students_active_idx
  on students(active);

-- ============================================================
-- CLASSES
-- ============================================================

create table classes (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  description text,

  active boolean not null default true,

  created_by uuid
    references profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index classes_active_idx
  on classes(active);

create index classes_created_by_idx
  on classes(created_by);

-- ============================================================
-- CLASS STUDENTS
--
-- MANY-TO-MANY
--
-- One student can belong to multiple classes.
-- One class can have multiple students.
-- ============================================================

create table class_students (
  id uuid primary key default gen_random_uuid(),

  class_id uuid not null
    references classes(id)
    on delete cascade,

  student_id uuid not null
    references students(id)
    on delete cascade,

  joined_at timestamptz not null default now(),

  constraint class_students_unique
    unique (class_id, student_id)
);

create index class_students_class_id_idx
  on class_students(class_id);

create index class_students_student_id_idx
  on class_students(student_id);

-- ============================================================
-- SUBJECTS
-- ============================================================

create table subjects (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  description text,

  active boolean not null default true,

  created_by uuid
    references profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint subjects_name_unique
    unique (name)
);

create index subjects_active_idx
  on subjects(active);

-- ============================================================
-- CATEGORIES
--
-- Category belongs to Subject.
-- ============================================================

create table categories (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid not null
    references subjects(id)
    on delete cascade,

  name text not null,

  description text,

  active boolean not null default true,

  created_by uuid
    references profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint categories_subject_name_unique
    unique (subject_id, name)
);

create index categories_subject_id_idx
  on categories(subject_id);

create index categories_active_idx
  on categories(active);

-- ============================================================
-- QUIZZES
-- ============================================================

create table quizzes (
  id uuid primary key default gen_random_uuid(),

  title text not null,

  description text,

  instructions text,

  subject_id uuid
    references subjects(id)
    on delete set null,

  category_id uuid
    references categories(id)
    on delete set null,

  difficulty difficulty_level not null default 'medium',

  status quiz_status not null default 'draft',

  is_public boolean not null default false,

  duration_minutes integer,

  max_attempts integer not null default 1,

  created_by uuid
    references profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint quizzes_duration_check
    check (
      duration_minutes is null
      or duration_minutes > 0
    ),

  constraint quizzes_max_attempts_check
    check (
      max_attempts > 0
    )
);

create index quizzes_subject_id_idx
  on quizzes(subject_id);

create index quizzes_category_id_idx
  on quizzes(category_id);

create index quizzes_difficulty_idx
  on quizzes(difficulty);

create index quizzes_status_idx
  on quizzes(status);

create index quizzes_public_idx
  on quizzes(is_public);

create index quizzes_created_by_idx
  on quizzes(created_by);

-- ============================================================
-- QUESTIONS
-- ============================================================

create table questions (
  id uuid primary key default gen_random_uuid(),

  quiz_id uuid not null
    references quizzes(id)
    on delete cascade,

  question text not null,

  type question_type not null default 'single_choice',

  points numeric(10,2) not null default 1,

  sort_order integer not null default 0,

  explanation text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint questions_points_check
    check (points >= 0)
);

create index questions_quiz_id_idx
  on questions(quiz_id);

create index questions_sort_order_idx
  on questions(quiz_id, sort_order);

-- ============================================================
-- QUESTION OPTIONS
--
-- Correct answer is stored server-side.
-- It must NEVER be exposed to student API responses.
-- ============================================================

create table question_options (
  id uuid primary key default gen_random_uuid(),

  question_id uuid not null
    references questions(id)
    on delete cascade,

  option_text text not null,

  is_correct boolean not null default false,

  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

create index question_options_question_id_idx
  on question_options(question_id);

-- ============================================================
-- INDIVIDUAL QUIZ ASSIGNMENTS
-- ============================================================

create table quiz_assignments (
  id uuid primary key default gen_random_uuid(),

  quiz_id uuid not null
    references quizzes(id)
    on delete cascade,

  student_id uuid not null
    references students(id)
    on delete cascade,

  assigned_by uuid
    references profiles(id)
    on delete set null,

  assigned_at timestamptz not null default now(),

  available_from timestamptz,

  due_at timestamptz,

  status assignment_status not null default 'assigned',

  notes text,

  constraint quiz_assignments_unique
    unique (quiz_id, student_id)
);

create index quiz_assignments_quiz_id_idx
  on quiz_assignments(quiz_id);

create index quiz_assignments_student_id_idx
  on quiz_assignments(student_id);

create index quiz_assignments_due_at_idx
  on quiz_assignments(due_at);

-- ============================================================
-- CLASS QUIZ ASSIGNMENTS
-- ============================================================

create table quiz_class_assignments (
  id uuid primary key default gen_random_uuid(),

  quiz_id uuid not null
    references quizzes(id)
    on delete cascade,

  class_id uuid not null
    references classes(id)
    on delete cascade,

  assigned_by uuid
    references profiles(id)
    on delete set null,

  assigned_at timestamptz not null default now(),

  available_from timestamptz,

  due_at timestamptz,

  status assignment_status not null default 'assigned',

  notes text,

  constraint quiz_class_assignments_unique
    unique (quiz_id, class_id)
);

create index quiz_class_assignments_quiz_id_idx
  on quiz_class_assignments(quiz_id);

create index quiz_class_assignments_class_id_idx
  on quiz_class_assignments(class_id);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),

  quiz_id uuid not null
    references quizzes(id)
    on delete cascade,

  student_id uuid not null
    references students(id)
    on delete cascade,

  attempt_number integer not null default 1,

  status attempt_status not null default 'in_progress',

  started_at timestamptz not null default now(),

  submitted_at timestamptz,

  score numeric(10,2) default 0,

  total_points numeric(10,2) default 0,

  percentage numeric(5,2) default 0,

  graded_by uuid
    references profiles(id)
    on delete set null,

  graded_at timestamptz,

  feedback text,

  constraint quiz_attempts_unique
    unique (quiz_id, student_id, attempt_number),

  constraint quiz_attempts_number_check
    check (attempt_number > 0),

  constraint quiz_attempts_score_check
    check (score >= 0),

  constraint quiz_attempts_percentage_check
    check (
      percentage >= 0
      and percentage <= 100
    )
);

create index quiz_attempts_quiz_id_idx
  on quiz_attempts(quiz_id);

create index quiz_attempts_student_id_idx
  on quiz_attempts(student_id);

create index quiz_attempts_status_idx
  on quiz_attempts(status);

-- ============================================================
-- ATTEMPT ANSWERS
-- ============================================================

create table attempt_answers (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid not null
    references quiz_attempts(id)
    on delete cascade,

  question_id uuid not null
    references questions(id)
    on delete cascade,

  selected_option_ids jsonb,

  text_answer text,

  is_correct boolean,

  points_awarded numeric(10,2) default 0,

  grader_feedback text,

  graded_by uuid
    references profiles(id)
    on delete set null,

  graded_at timestamptz,

  created_at timestamptz not null default now(),

  constraint attempt_answers_unique
    unique (attempt_id, question_id),

  constraint attempt_answers_points_check
    check (points_awarded >= 0)
);

create index attempt_answers_attempt_id_idx
  on attempt_answers(attempt_id);

create index attempt_answers_question_id_idx
  on attempt_answers(question_id);