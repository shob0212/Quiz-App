-- 1. extensions
-- PostGIS extension is required for spatial queries, but we'll comment it out
-- as it might not be needed for this project. Enable it if you need geospatial data types.
-- create extension if not exists postgis with schema extensions;


-- 2. tables

-- public.questions definition
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answers INT[] NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    last_answered TIMESTAMPTZ,
    consecutive_correct INT DEFAULT 0 NOT NULL,
    consecutive_wrong INT DEFAULT 0 NOT NULL,
    position SERIAL NOT NULL
);
COMMENT ON TABLE public.questions IS 'Stores the quiz questions.';

-- public.quiz_sessions definition
CREATE TABLE public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    total_questions INT NOT NULL,
    correct_count INT NOT NULL,
    incorrect_count INT NOT NULL,
    correct_rate REAL NOT NULL,
    elapsed_time_seconds INT NOT NULL,
    categories TEXT[] NOT NULL
);
COMMENT ON TABLE public.quiz_sessions IS 'Stores the results of each quiz session.';

-- public.history definition
CREATE TABLE public.history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    result BOOLEAN NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    user_answers INT[],
    quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.history IS 'Logs every answer for every question.';


-- 3. Row Level Security (RLS) policies
-- Make sure to update these policies to match your application's security requirements.

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Policies for public.questions
CREATE POLICY "Allow public read access to questions"
ON public.questions FOR SELECT USING (true);

CREATE POLICY "Allow all access for authenticated users to questions"
ON public.questions FOR ALL USING (auth.role() = 'authenticated');

-- Policies for public.quiz_sessions
CREATE POLICY "Allow public read access to quiz_sessions"
ON public.quiz_sessions FOR SELECT USING (true);

CREATE POLICY "Allow all access for authenticated users to quiz_sessions"
ON public.quiz_sessions FOR ALL USING (auth.role() = 'authenticated');

-- Policies for public.history
CREATE POLICY "Allow public read access to history"
ON public.history FOR SELECT USING (true);

CREATE POLICY "Allow all access for authenticated users to history"
ON public.history FOR ALL USING (auth.role() = 'authenticated');


-- 4. functions and triggers

-- Function to get a specified number of random questions
CREATE OR REPLACE FUNCTION get_random_questions(num_questions INT, excluded_ids UUID[])
RETURNS SETOF questions AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM questions
    WHERE id <> ALL(excluded_ids)
    ORDER BY random()
    LIMIT num_questions;
END;
$$ LANGUAGE plpgsql;

-- Function to get questions for review (answered incorrectly)
CREATE OR REPLACE FUNCTION get_review_questions(session_id UUID)
RETURNS SETOF questions AS $$
BEGIN
    RETURN QUERY
    SELECT q.*
    FROM questions q
    JOIN history h ON q.id = h.question_id
    WHERE h.quiz_session_id = session_id AND h.result = false;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set the position of a new question
CREATE OR REPLACE FUNCTION set_initial_position()
RETURNS TRIGGER AS $$
DECLARE
    max_pos INT;
BEGIN
    SELECT COALESCE(MAX(position), 0) INTO max_pos FROM public.questions;
    NEW.position := max_pos + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_position_trigger
BEFORE INSERT ON public.questions
FOR EACH ROW
EXECUTE FUNCTION set_initial_position();
