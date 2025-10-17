-- 記憶度が低い問題（60未満）をランダムに1件取得する関数
CREATE OR REPLACE FUNCTION public.get_weak_question()
RETURNS SETOF questions AS $$
DECLARE
    total_rows INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_rows FROM public.questions WHERE memory_strength < 60;
    IF total_rows = 0 THEN
        RETURN; -- 条件に合う問題がない場合は何も返さない
    END IF;
    random_offset := floor(random() * total_rows);
    RETURN QUERY SELECT * FROM public.questions WHERE memory_strength < 60 OFFSET random_offset LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 指定されたカテゴリからランダムに1件取得する関数
CREATE OR REPLACE FUNCTION public.get_category_question(p_category TEXT)
RETURNS SETOF questions AS $$
DECLARE
    total_rows INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_rows FROM public.questions WHERE category = p_category;
    IF total_rows = 0 THEN
        RETURN; -- 条件に合う問題がない場合は何も返さない
    END IF;
    random_offset := floor(random() * total_rows);
    RETURN QUERY SELECT * FROM public.questions WHERE category = p_category OFFSET random_offset LIMIT 1;
END;
$$ LANGUAGE plpgsql;
