-- positionカラムのデータ型を、タイムスタンプを格納できるBIGINTに変更します。
ALTER TABLE public.questions
ALTER COLUMN "position" TYPE BIGINT;

-- 新しい行が挿入される前に、positionに現在のエポックタイム（マイクロ秒）を自動的に設定する関数を作成します。
CREATE OR REPLACE FUNCTION public.set_initial_position()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- positionが指定されていない場合のみ、タイムスタンプを設定
  IF NEW."position" IS NULL THEN
    NEW."position" := (EXTRACT(EPOCH FROM NOW()) * 1000000)::BIGINT;
  END IF;
  RETURN NEW;
END;
$$;

-- 既存のトリガーがあれば削除します（安全のため）
DROP TRIGGER IF EXISTS set_questions_position_on_insert ON public.questions;

-- questionsテーブルに新しい行が挿入される「前」に、set_initial_position関数を呼び出すトリガーを作成します。
CREATE TRIGGER set_questions_position_on_insert
BEFORE INSERT ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_position();
