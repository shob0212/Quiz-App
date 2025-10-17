-- このファイルはデバッグ用のテスト関数を作成します。
-- 問題解決後に削除することも可能です。

CREATE OR REPLACE FUNCTION public.test_count_questions()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
    question_count BIGINT;
BEGIN
    SELECT count(*) INTO question_count FROM public.questions;
    RETURN question_count;
END;
$$;
