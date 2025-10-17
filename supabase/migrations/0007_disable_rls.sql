-- このマイグレーションは、すべてのテーブルの行レベルセキュリティ(RLS)を無効にします。
-- これにより、アプリケーションからのデータアクセスが自由になりますが、
-- 誰でもデータを読み書きできるようになるため、公開アプリケーションには適していません。

-- 既存のポリシーを削除します
DROP POLICY IF EXISTS "Public read access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public write access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public read access for history" ON public.history;
DROP POLICY IF EXISTS "Public write access for history" ON public.history;

-- テーブルのRLSを無効にします
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.history DISABLE ROW LEVEL SECURITY;
