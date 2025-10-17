-- このマイグレーションは、デバッグに使用した不要な関数を削除します。

-- 問題のあった統計取得関数を削除
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- デバッグ用のテスト関数を削除
DROP FUNCTION IF EXISTS public.test_count_questions();
