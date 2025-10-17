-- ホーム画面に表示するための3つの統計情報（総問題数、出題済み問題数、直近1回が正解だった問題数）を効率的に計算する関数です。
CREATE OR REPLACE FUNCTION public.get_homepage_stats()
RETURNS TABLE (
    total_questions_count BIGINT,
    answered_questions_count BIGINT,
    latest_attempt_correct_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH latest_attempts AS (
      -- 各問題の最新の回答履歴を1件ずつ取得する
      SELECT
        DISTINCT ON (question_id)
        question_id,
        result
      FROM public.history
      ORDER BY question_id, answered_at DESC
    )
    SELECT
      (SELECT count(*) FROM public.questions) AS total_questions_count,
      (SELECT count(*) FROM latest_attempts) AS answered_questions_count,
      (SELECT count(*) FROM latest_attempts WHERE result = true) AS latest_attempt_correct_count;
END;
$$;
