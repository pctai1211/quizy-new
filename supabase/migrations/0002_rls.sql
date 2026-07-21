-- QUIZY row level security
-- QUIZY has a single role: authenticated admins. Students never
-- authenticate, so all public-facing reads/writes (viewing a published
-- quiz, submitting answers, viewing a result) are performed server-side
-- with the service-role key in Route Handlers and Server Components,
-- which bypasses RLS entirely. RLS below therefore only needs to grant
-- access to authenticated admins and can otherwise stay closed.

alter table profiles enable row level security;
alter table batches enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table submissions enable row level security;
alter table answers enable row level security;

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view their own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- batches
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view batches"
  on batches for select
  to authenticated
  using (true);

create policy "Admins can insert batches"
  on batches for insert
  to authenticated
  with check (true);

create policy "Admins can update batches"
  on batches for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete batches"
  on batches for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- quizzes
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view quizzes"
  on quizzes for select
  to authenticated
  using (true);

create policy "Admins can insert quizzes"
  on quizzes for insert
  to authenticated
  with check (true);

create policy "Admins can update quizzes"
  on quizzes for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete quizzes"
  on quizzes for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- questions
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view questions"
  on questions for select
  to authenticated
  using (true);

create policy "Admins can insert questions"
  on questions for insert
  to authenticated
  with check (true);

create policy "Admins can update questions"
  on questions for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete questions"
  on questions for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- question_options
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view question options"
  on question_options for select
  to authenticated
  using (true);

create policy "Admins can insert question options"
  on question_options for insert
  to authenticated
  with check (true);

create policy "Admins can update question options"
  on question_options for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete question options"
  on question_options for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- submissions
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view submissions"
  on submissions for select
  to authenticated
  using (true);

-- No insert/update/delete policies for submissions: rows are only ever
-- written by the /api/submit Route Handler using the service-role key,
-- which bypasses RLS. This guarantees grading always happens server-side.

-- ─────────────────────────────────────────────────────────────
-- answers
-- ─────────────────────────────────────────────────────────────
create policy "Admins can view answers"
  on answers for select
  to authenticated
  using (true);

-- Same rationale as submissions: writes only via the service-role key.
