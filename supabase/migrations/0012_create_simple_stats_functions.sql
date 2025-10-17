-- 総問題数を返すだけのシンプルな関数
CREATE OR REPLACE FUNCTION rpc_get_total_questions_count()
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(*) FROM public.questions;
$$;

-- 出題済み問題のユニーク数を返すだけのシンプルな関数
CREATE OR REPLACE FUNCTION rpc_get_answered_questions_count()
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(DISTINCT question_id) FROM public.history;
$$;

-- 各問題の最新の回答が正解だった数を返すだけのシンプルな関数
CREATE OR REPLACE FUNCTION rpc_get_latest_attempt_correct_count()
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    WITH latest_attempts AS (
      SELECT DISTINCT ON (question_id) result
      FROM public.history
      ORDER BY question_id, answered_at DESC
    )
    SELECT count(*)
    FROM latest_attempts
    WHERE result = true
  );
END;
$$;
