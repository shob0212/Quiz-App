-- User scoped data model and migration helper

-- Profiles table (user info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User scoped history/session ownership
ALTER TABLE public.history
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Per-user notes for each question
CREATE TABLE IF NOT EXISTS public.question_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_history_user_id_answered_at ON public.history(user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_user_id_question_id ON public.history(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id_finished_at ON public.quiz_sessions(user_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_notes_user_id_question_id ON public.question_notes(user_id, question_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to history" ON public.history;
DROP POLICY IF EXISTS "Allow all access for authenticated users to history" ON public.history;
DROP POLICY IF EXISTS "Allow public read access to quiz_sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Allow all access for authenticated users to quiz_sessions" ON public.quiz_sessions;

CREATE POLICY "History select own" ON public.history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "History insert own" ON public.history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "History update own" ON public.history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "History delete own" ON public.history
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Quiz sessions select own" ON public.quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Quiz sessions insert own" ON public.quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Quiz sessions update own" ON public.quiz_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Quiz sessions delete own" ON public.quiz_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles upsert own" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Question notes select own" ON public.question_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Question notes insert own" ON public.question_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Question notes update own" ON public.question_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Question notes delete own" ON public.question_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on mutable tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_question_notes_updated_at ON public.question_notes;
CREATE TRIGGER set_question_notes_updated_at
BEFORE UPDATE ON public.question_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migrate legacy rows/explanations to a single admin user.
-- Allowed only for currently authenticated user whose email starts with 'admin'.
CREATE OR REPLACE FUNCTION public.migrate_legacy_data_to_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  email_claim TEXT;
  moved_history_count INTEGER;
  moved_sessions_count INTEGER;
  moved_explanations_count INTEGER;
BEGIN
  email_claim := COALESCE(auth.jwt() ->> 'email', '');

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Target user mismatch';
  END IF;

  IF email_claim NOT ILIKE 'admin%' THEN
    RAISE EXCEPTION 'Only admin user can run migration';
  END IF;

  UPDATE public.history
  SET user_id = target_user_id
  WHERE user_id IS NULL;
  GET DIAGNOSTICS moved_history_count = ROW_COUNT;

  UPDATE public.quiz_sessions
  SET user_id = target_user_id
  WHERE user_id IS NULL;
  GET DIAGNOSTICS moved_sessions_count = ROW_COUNT;

  INSERT INTO public.question_notes (user_id, question_id, note)
  SELECT target_user_id, q.id, q.explanation
  FROM public.questions q
  WHERE q.explanation IS NOT NULL
    AND BTRIM(q.explanation) <> ''
  ON CONFLICT (user_id, question_id)
  DO UPDATE SET note = EXCLUDED.note;
  GET DIAGNOSTICS moved_explanations_count = ROW_COUNT;

  UPDATE public.questions
  SET explanation = NULL
  WHERE explanation IS NOT NULL
    AND BTRIM(explanation) <> '';

  RETURN json_build_object(
    'moved_history', moved_history_count,
    'moved_sessions', moved_sessions_count,
    'moved_explanations', moved_explanations_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.migrate_legacy_data_to_user(UUID) TO authenticated;
