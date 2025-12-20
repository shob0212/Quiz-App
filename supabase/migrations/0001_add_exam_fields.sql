-- Add exam-related fields to quiz_sessions
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS is_exam_mode BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS unscored_question_ids UUID[] NULL,
  ADD COLUMN IF NOT EXISTS correct_rate_excluding_unscored REAL NULL,
  ADD COLUMN IF NOT EXISTS pass BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS pass_threshold REAL NULL,
  ADD COLUMN IF NOT EXISTS exam_duration_seconds INT NULL;
