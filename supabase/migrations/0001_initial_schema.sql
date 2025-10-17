-- questionsテーブルの作成
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answers INT[] NOT NULL,
    explanation TEXT,
    type TEXT NOT NULL,
    memory_strength INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- historyテーブルの作成
CREATE TABLE history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    result BOOLEAN NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- テーブルの行レベルセキュリティ(RLS)を有効にします
-- これにより、誰がデータにアクセスできるかを細かく制御できます
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- 誰でもデータを読み取れるようにするポリシー
-- アプリの要件に合わせて変更してください
CREATE POLICY "Public read access for questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Public read access for history" ON history
    FOR SELECT USING (true);

-- 誰でもデータを書き込めるようにするポリシー
-- 注意：これは開発用です。本番では認証されたユーザーのみに制限することを強く推奨します
CREATE POLICY "Public write access for questions" ON questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public write access for history" ON history
    FOR INSERT WITH CHECK (true);
