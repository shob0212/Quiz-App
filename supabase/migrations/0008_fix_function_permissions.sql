-- このマイグレーションは、既存のすべてのデータベース関数を「SECURITY DEFINER」付きで再作成します。
-- これにより、関数が管理者の権限で実行され、テーブルのデータを確実に読み取れるようになります。

-- 統計取得関数
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    total_questions BIGINT,
    total_answers BIGINT,
    total_correct_answers BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS
$$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.questions) AS total_questions,
        (SELECT count(*) FROM public.history) AS total_answers,
        (SELECT count(*) FROM public.history WHERE result = true) AS total_correct_answers;
END;
$$;

-- ランダム問題取得関数
CREATE OR REPLACE FUNCTION public.get_random_question()
RETURNS SETOF questions 
LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
    total_rows INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_rows FROM public.questions;
    IF total_rows = 0 THEN
        RETURN; 
    END IF;
    random_offset := floor(random() * total_rows);
    RETURN QUERY SELECT * FROM public.questions OFFSET random_offset LIMIT 1;
END;
$$;

-- 苦手問題取得関数
CREATE OR REPLACE FUNCTION public.get_weak_question()
RETURNS SETOF questions 
LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
    total_rows INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_rows FROM public.questions WHERE memory_strength < 60;
    IF total_rows = 0 THEN
        RETURN; 
    END IF;
    random_offset := floor(random() * total_rows);
    RETURN QUERY SELECT * FROM public.questions WHERE memory_strength < 60 OFFSET random_offset LIMIT 1;
END;
$$;

-- カテゴリ別問題取得関数
CREATE OR REPLACE FUNCTION public.get_category_question(p_category TEXT)
RETURNS SETOF questions 
LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
    total_rows INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_rows FROM public.questions WHERE category = p_category;
    IF total_rows = 0 THEN
        RETURN; 
    END IF;
    random_offset := floor(random() * total_rows);
    RETURN QUERY SELECT * FROM public.questions WHERE category = p_category OFFSET random_offset LIMIT 1;
END;
$$;

-- 記憶度更新関数
CREATE OR REPLACE FUNCTION public.update_memory_strength(q_id uuid, is_correct boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
  rec RECORD;
  elapsed_days FLOAT8;
  lambda_base FLOAT8 := 0.05;
  lambda FLOAT8;
  new_strength FLOAT8;
BEGIN
  SELECT * INTO rec FROM public.questions WHERE id = q_id;

  IF rec.last_answered IS NULL THEN
    IF is_correct THEN
      UPDATE public.questions
      SET memory_strength = 100, consecutive_correct = 1, consecutive_wrong = 0, last_answered = NOW()
      WHERE id = q_id;
    ELSE
      UPDATE public.questions
      SET memory_strength = 50, consecutive_correct = 0, consecutive_wrong = 1, last_answered = NOW()
      WHERE id = q_id;
    END IF;
    RETURN;
  END IF;

  elapsed_days := EXTRACT(EPOCH FROM (NOW() - rec.last_answered)) / 86400.0;
  lambda := lambda_base * (1 - 0.1 * rec.consecutive_correct) * (1 + 0.1 * rec.consecutive_wrong);
  lambda := GREATEST(0.01, lambda);
  new_strength := rec.memory_strength * EXP(-lambda * elapsed_days);

  IF is_correct THEN
    UPDATE public.questions
    SET memory_strength = LEAST(100.0, new_strength + 20.0), consecutive_correct = rec.consecutive_correct + 1, consecutive_wrong = 0, last_answered = NOW()
    WHERE id = q_id;
  ELSE
    UPDATE public.questions
    SET memory_strength = GREATEST(0.0, new_strength - 20.0), consecutive_correct = 0, consecutive_wrong = rec.consecutive_wrong + 1, last_answered = NOW()
    WHERE id = q_id;
  END IF;
END;
$$;
