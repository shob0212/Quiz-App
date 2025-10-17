CREATE OR REPLACE FUNCTION get_random_question()
RETURNS SETOF questions AS $$
DECLARE
    total_rows INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_rows FROM questions;
    IF total_rows = 0 THEN
        RETURN; -- テーブルが空の場合は何も返さない
    END IF;
    random_offset := floor(random() * total_rows);
    RETURN QUERY SELECT * FROM questions OFFSET random_offset LIMIT 1;
END;
$$ LANGUAGE plpgsql;
