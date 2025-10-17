-- 忘却曲線を考慮して記憶度(memory_strength)を更新する関数
CREATE OR REPLACE FUNCTION public.update_memory_strength(q_id uuid, is_correct boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  -- 現在のレコードを保持する変数
  rec RECORD;
  -- 計算用の変数
  elapsed_days FLOAT8;
  lambda_base FLOAT8 := 0.05;
  lambda FLOAT8;
  new_strength FLOAT8;
BEGIN
  -- 対象の問題の現在の状態を取得
  SELECT * INTO rec FROM public.questions WHERE id = q_id;

  -- last_answeredがNULLの場合は初回回答
  IF rec.last_answered IS NULL THEN
    IF is_correct THEN
      -- 初回で正解の場合
      UPDATE public.questions
      SET 
        memory_strength = 100,
        consecutive_correct = 1,
        consecutive_wrong = 0,
        last_answered = NOW()
      WHERE id = q_id;
    ELSE
      -- 初回で不正解の場合
      UPDATE public.questions
      SET 
        memory_strength = 50,
        consecutive_correct = 0,
        consecutive_wrong = 1,
        last_answered = NOW()
      WHERE id = q_id;
    END IF;
    RETURN;
  END IF;

  -- --- 2回目以降の回答 --- --

  -- 1. 経過日数に基づく記憶度の減衰
  -- 経過日数を計算 (秒単位で取得し、1日の秒数86400で割る)
  elapsed_days := EXTRACT(EPOCH FROM (NOW() - rec.last_answered)) / 86400.0;

  -- 忘却率λ（ラムダ）を計算
  lambda := lambda_base * (1 - 0.1 * rec.consecutive_correct) * (1 + 0.1 * rec.consecutive_wrong);
  -- λの下限を0.01に設定
  lambda := GREATEST(0.01, lambda);

  -- 指数関数的に記憶度を減衰させる
  new_strength := rec.memory_strength * EXP(-lambda * elapsed_days);

  -- 2. 今回の回答結果に基づき記憶度を更新
  IF is_correct THEN
    -- 正解した場合
    UPDATE public.questions
    SET
      memory_strength = LEAST(100.0, new_strength + 20.0), -- 上限100
      consecutive_correct = rec.consecutive_correct + 1,
      consecutive_wrong = 0,
      last_answered = NOW()
    WHERE id = q_id;
  ELSE
    -- 不正解した場合
    UPDATE public.questions
    SET
      memory_strength = GREATEST(0.0, new_strength - 20.0), -- 下限0
      consecutive_correct = 0,
      consecutive_wrong = rec.consecutive_wrong + 1,
      last_answered = NOW()
    WHERE id = q_id;
  END IF;

END;
$$;
