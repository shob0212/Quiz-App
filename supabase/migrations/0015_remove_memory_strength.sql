-- memory_strength カラムと関連する関数を削除します。

-- 関連する関数を削除
DROP FUNCTION IF EXISTS public.update_memory_strength(uuid, boolean);
DROP FUNCTION IF EXISTS public.get_weak_question();

-- questions テーブルから memory_strength カラムを削除
ALTER TABLE public.questions DROP COLUMN IF EXISTS memory_strength;
