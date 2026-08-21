-- ============================================================
-- QUIZY - ROW LEVEL SECURITY
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.get_my_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;


create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;


create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'student'
  );
$$;


-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table profiles enable row level security;
alter table students enable row level security;

alter table classes enable row level security;
alter table class_students enable row level security;

alter table subjects enable row level security;
alter table categories enable row level security;

alter table quizzes enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;

alter table quiz_assignments enable row level security;
alter table quiz_class_assignments enable row level security;

alter table quiz_attempts enable row level security;
alter table attempt_answers enable row level security;


-- ============================================================
-- PROFILES
-- ============================================================

-- User can view own profile.
create policy "Users can view own profile"
on profiles
for select
to authenticated
using (
  id = auth.uid()
);


-- Admin can view all profiles.
create policy "Admins can view all profiles"
on profiles
for select
to authenticated
using (
  public.is_admin()
);


-- Admin can create/update profiles.
create policy "Admins can insert profiles"
on profiles
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update profiles"
on profiles
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- User can update their own non-role information.
--
-- IMPORTANT:
-- Role should not be changed by the user.
create policy "Users can update own profile"
on profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
  and role = (
    select p.role
    from profiles p
    where p.id = auth.uid()
  )
);


-- ============================================================
-- STUDENTS
-- ============================================================

-- Student can view own student record.
create policy "Students can view own record"
on students
for select
to authenticated
using (
  id = auth.uid()
);


-- Admin can manage students.
create policy "Admins can view students"
on students
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert students"
on students
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update students"
on students
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete students"
on students
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- CLASSES
-- ============================================================

-- Students can see classes they belong to.
create policy "Students can view their classes"
on classes
for select
to authenticated
using (
  exists (
    select 1
    from class_students cs
    where cs.class_id = classes.id
      and cs.student_id = auth.uid()
  )
);


-- Admin can manage classes.
create policy "Admins can view all classes"
on classes
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert classes"
on classes
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update classes"
on classes
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete classes"
on classes
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- CLASS STUDENTS
-- ============================================================

-- Student can see their own memberships.
create policy "Students can view own memberships"
on class_students
for select
to authenticated
using (
  student_id = auth.uid()
);


-- Admin can manage memberships.
create policy "Admins can view memberships"
on class_students
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert memberships"
on class_students
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update memberships"
on class_students
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete memberships"
on class_students
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- SUBJECTS
-- ============================================================

-- Public subjects can be viewed by authenticated users.
create policy "Authenticated users can view subjects"
on subjects
for select
to authenticated
using (
  active = true
  or public.is_admin()
);


create policy "Admins can insert subjects"
on subjects
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update subjects"
on subjects
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete subjects"
on subjects
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- CATEGORIES
-- ============================================================

create policy "Authenticated users can view categories"
on categories
for select
to authenticated
using (
  active = true
  or public.is_admin()
);


create policy "Admins can insert categories"
on categories
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update categories"
on categories
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete categories"
on categories
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- QUIZZES
-- ============================================================

-- Admin can see everything.
create policy "Admins can view all quizzes"
on quizzes
for select
to authenticated
using (
  public.is_admin()
);


-- Students can see PUBLIC published quizzes.
create policy "Students can view public quizzes"
on quizzes
for select
to authenticated
using (
  public.is_student()
  and status = 'published'
  and is_public = true
);


-- Students can see quizzes directly assigned to them.
create policy "Students can view assigned quizzes"
on quizzes
for select
to authenticated
using (
  public.is_student()
  and status = 'published'
  and exists (
    select 1
    from quiz_assignments qa
    where qa.quiz_id = quizzes.id
      and qa.student_id = auth.uid()
      and qa.status <> 'cancelled'
  )
);


-- Students can see quizzes assigned to their classes.
create policy "Students can view class quizzes"
on quizzes
for select
to authenticated
using (
  public.is_student()
  and status = 'published'
  and exists (
    select 1
    from quiz_class_assignments qca
    join class_students cs
      on cs.class_id = qca.class_id
    where qca.quiz_id = quizzes.id
      and cs.student_id = auth.uid()
      and qca.status <> 'cancelled'
  )
);


-- Only admins can create quizzes.
create policy "Admins can insert quizzes"
on quizzes
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update quizzes"
on quizzes
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete quizzes"
on quizzes
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- QUESTIONS
-- ============================================================

-- Admin can manage questions.
create policy "Admins can view all questions"
on questions
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert questions"
on questions
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update questions"
on questions
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete questions"
on questions
for delete
to authenticated
using (
  public.is_admin()
);


-- Student can see questions only for quizzes they can access.
create policy "Students can view quiz questions"
on questions
for select
to authenticated
using (
  public.is_student()
  and exists (
    select 1
    from quizzes q
    where q.id = questions.quiz_id
      and q.status = 'published'
      and (
        q.is_public = true

        or exists (
          select 1
          from quiz_assignments qa
          where qa.quiz_id = q.id
            and qa.student_id = auth.uid()
            and qa.status <> 'cancelled'
        )

        or exists (
          select 1
          from quiz_class_assignments qca
          join class_students cs
            on cs.class_id = qca.class_id
          where qca.quiz_id = q.id
            and cs.student_id = auth.uid()
            and qca.status <> 'cancelled'
        )
      )
  )
);


-- ============================================================
-- QUESTION OPTIONS
-- ============================================================

-- Admin can see everything including correct answers.
create policy "Admins can view question options"
on question_options
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert question options"
on question_options
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update question options"
on question_options
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete question options"
on question_options
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- IMPORTANT
--
-- Students can NOT directly SELECT question_options.
--
-- Why?
--
-- question_options contains:
--
--   is_correct
--
-- If students could query this table directly,
-- they could retrieve the correct answers.
--
-- Student quiz APIs must return sanitized options
-- without is_correct.
-- ============================================================


-- ============================================================
-- QUIZ ASSIGNMENTS
-- ============================================================

-- Admin only.
create policy "Admins can view individual assignments"
on quiz_assignments
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert individual assignments"
on quiz_assignments
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update individual assignments"
on quiz_assignments
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete individual assignments"
on quiz_assignments
for delete
to authenticated
using (
  public.is_admin()
);


-- Student can see their own assignment.
create policy "Students can view own assignments"
on quiz_assignments
for select
to authenticated
using (
  public.is_student()
  and student_id = auth.uid()
);


-- ============================================================
-- CLASS QUIZ ASSIGNMENTS
-- ============================================================

create policy "Admins can view class assignments"
on quiz_class_assignments
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert class assignments"
on quiz_class_assignments
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update class assignments"
on quiz_class_assignments
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete class assignments"
on quiz_class_assignments
for delete
to authenticated
using (
  public.is_admin()
);


-- Student can see assignments for their classes.
create policy "Students can view class assignments"
on quiz_class_assignments
for select
to authenticated
using (
  public.is_student()
  and exists (
    select 1
    from class_students cs
    where cs.class_id = quiz_class_assignments.class_id
      and cs.student_id = auth.uid()
  )
);


-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================

-- Student can view own attempts.
create policy "Students can view own attempts"
on quiz_attempts
for select
to authenticated
using (
  public.is_student()
  and student_id = auth.uid()
);


-- Student can create own attempt.
create policy "Students can create own attempts"
on quiz_attempts
for insert
to authenticated
with check (
  public.is_student()
  and student_id = auth.uid()
);


-- Student can update own in-progress attempt.
create policy "Students can update own attempts"
on quiz_attempts
for update
to authenticated
using (
  public.is_student()
  and student_id = auth.uid()
  and status = 'in_progress'
)
with check (
  public.is_student()
  and student_id = auth.uid()
);


-- Admin can manage attempts.
create policy "Admins can view all attempts"
on quiz_attempts
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert attempts"
on quiz_attempts
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update attempts"
on quiz_attempts
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete attempts"
on quiz_attempts
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- ATTEMPT ANSWERS
-- ============================================================

-- Student can view own answers.
create policy "Students can view own attempt answers"
on attempt_answers
for select
to authenticated
using (
  public.is_student()
  and exists (
    select 1
    from quiz_attempts qa
    where qa.id = attempt_answers.attempt_id
      and qa.student_id = auth.uid()
  )
);


-- Student can create answers for own attempt.
create policy "Students can insert own attempt answers"
on attempt_answers
for insert
to authenticated
with check (
  public.is_student()
  and exists (
    select 1
    from quiz_attempts qa
    where qa.id = attempt_answers.attempt_id
      and qa.student_id = auth.uid()
      and qa.status = 'in_progress'
  )
);


-- Student can update answers while attempt is in progress.
create policy "Students can update own attempt answers"
on attempt_answers
for update
to authenticated
using (
  public.is_student()
  and exists (
    select 1
    from quiz_attempts qa
    where qa.id = attempt_answers.attempt_id
      and qa.student_id = auth.uid()
      and qa.status = 'in_progress'
  )
)
with check (
  public.is_student()
  and exists (
    select 1
    from quiz_attempts qa
    where qa.id = attempt_answers.attempt_id
      and qa.student_id = auth.uid()
      and qa.status = 'in_progress'
  )
);


-- Admin can manage answers / grading.
create policy "Admins can view all attempt answers"
on attempt_answers
for select
to authenticated
using (
  public.is_admin()
);


create policy "Admins can insert attempt answers"
on attempt_answers
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update attempt answers"
on attempt_answers
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete attempt answers"
on attempt_answers
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================================
-- SERVICE ROLE PRIVILEGES
-- ============================================================

GRANT SELECT
ON TABLE public.quizzes
TO service_role;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.quiz_attempts
TO service_role;

GRANT SELECT, UPDATE
ON TABLE public.quiz_assignments
TO service_role;

GRANT SELECT, UPDATE
ON TABLE public.questions
TO service_role;

GRANT SELECT, UPDATE
ON TABLE public.question_options
TO service_role;

GRANT SELECT, UPDATE, INSERT
ON TABLE public.attempt_answers
TO service_role;

GRANT SELECT
ON TABLE public.students
TO service_role;

GRANT SELECT
ON TABLE public.profiles
TO service_role;