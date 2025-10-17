CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    total_questions BIGINT,
    total_answers BIGINT,
    total_correct_answers BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.questions) AS total_questions,
        (SELECT count(*) FROM public.history) AS total_answers,
        (SELECT count(*) FROM public.history WHERE result = true) AS total_correct_answers;
END;
$$ LANGUAGE plpgsql;
