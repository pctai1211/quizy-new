-- Phase 1 assessment engine: keep legacy `mcq` rows valid while adding named types.
alter table questions add column if not exists correct_answers jsonb not null default '[]'::jsonb;

alter table questions drop constraint if exists questions_question_type_check;
alter table questions add constraint questions_question_type_check
  check (question_type in ('mcq', 'single_choice', 'multiple_choice', 'short_answer', 'open_ended'));

-- Partial multiple-choice scores may be fractional.
alter table submissions alter column score type numeric using score::numeric;
