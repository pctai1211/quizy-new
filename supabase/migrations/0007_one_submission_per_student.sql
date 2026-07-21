-- QUIZY: one submission per student per quiz
-- Enforced at the DB level (not just in application code) so it holds even
-- under concurrent requests. Case-insensitive on email since students.email
-- is always stored lowercased, but older/legacy submissions may not be.

create unique index if not exists submissions_quiz_email_unique_idx
  on submissions (quiz_id, lower(email));
