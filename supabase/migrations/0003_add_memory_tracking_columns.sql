-- 記憶度をより精密に扱うため、データ型をFLOAT8に変更します
ALTER TABLE public.questions
ALTER COLUMN memory_strength TYPE FLOAT8;

-- 連続正解数、連続不正解数、最終回答日のカラムを追加します
ALTER TABLE public.questions
ADD COLUMN last_answered TIMESTAMP WITH TIME ZONE,
ADD COLUMN consecutive_correct INT NOT NULL DEFAULT 0,
ADD COLUMN consecutive_wrong INT NOT NULL DEFAULT 0;
