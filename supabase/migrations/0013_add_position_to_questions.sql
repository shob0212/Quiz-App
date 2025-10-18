-- 問題の並び順を保存するためのpositionカラムを追加します。
-- デフォルトでは、既存の問題には作成日順に番号が振られます。
ALTER TABLE public.questions
ADD COLUMN "position" INTEGER;

CREATE SEQUENCE questions_position_seq;

UPDATE public.questions
SET "position" = nextval('questions_position_seq');

ALTER TABLE public.questions
ALTER COLUMN "position" SET NOT NULL;

DROP SEQUENCE questions_position_seq;
