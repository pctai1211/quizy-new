-- QUIZY quiz scheduling
-- Publishing a quiz now selects which batches are allowed to take it at all
-- (published_batches). A separate, time-boxed "activation" opens the quiz
-- to a (sub)set of those batches for a 30-minute window (active_batches +
-- active_until); it's read as active only while active_until is in the
-- future, so it "toggles off" on its own without a background job.

alter table quizzes
  add column if not exists published_batches text[] not null default '{}',
  add column if not exists active_batches text[] not null default '{}',
  add column if not exists active_until timestamptz;
