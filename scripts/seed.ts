// scripts/seed.ts
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { createClient } from '@supabase/supabase-js'

// .env.localファイルから環境変数を明示的に読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// --- 型定義 (lib/data.tsからコピー) ---
interface Question {
  id: string;
  type: 'single' | 'multiple';
  options: string[];
  category: string;
  position: number;
  question: string;
  created_at: string;
  explanation: string | null;
  last_answered: string | null;
  correct_answers: number[];
  consecutive_wrong: number;
  consecutive_correct: number;
}

interface History {
  id: string;
  result: boolean;
  answered_at: string;
  question_id: string;
  quiz_session_id: string;
  user_answers: number[];
}

interface QuizSession {
  id: string;
  started_at: string;
  finished_at: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  correct_rate: number;
  elapsed_time_seconds: number;
  categories: string[];
}


// --- Supabaseクライアントの初期化 ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or anon key is not defined in your .env.local file');
  process.exit(1);
}

// 注意: このスクリプトはサーバーサイド（Node.js）で実行されるため、
// サービスロールキーの使用が適切ですが、今回は既存の実装に合わせてanonキーを使用します。
// より安全な操作のためには、サービスロールキーを別の環境変数として設定することを推奨します。
const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- データ移行メイン関数 ---
async function main() {
  console.log('Starting data migration to Supabase...');

  try {
    // 1. Questions の移行
    console.log('\nMigrating questions...');
    const questionsPath = path.join(process.cwd(), 'questions.json');
    const questionsData = await fs.readFile(questionsPath, 'utf-8');
    const questions: Question[] = JSON.parse(questionsData);
    
    // correct_answersがnullの場合、空の配列に変換
    const cleanedQuestions = questions.map(q => ({
      ...q,
      correct_answers: q.correct_answers ?? [],
    }));

    const { error: questionsError } = await supabase.from('questions').upsert(cleanedQuestions);
    if (questionsError) {
      console.error('Error migrating questions:', questionsError.message);
    } else {
      console.log(`Successfully migrated ${questions.length} questions.`);
    }

    // 2. History の移行
    console.log('\nMigrating history...');
    const historyPath = path.join(process.cwd(), 'history.json');
    try {
      const historyData = await fs.readFile(historyPath, 'utf-8');
      const history: History[] = JSON.parse(historyData);
       // user_answersがnullの場合、空の配列に変換
      const cleanedHistory = history.map(h => ({
        ...h,
        user_answers: h.user_answers ?? [],
      }));
      const { error: historyError } = await supabase.from('history').upsert(cleanedHistory);
      if (historyError) {
        console.error('Error migrating history:', historyError.message);
      } else {
        console.log(`Successfully migrated ${history.length} history records.`);
      }
    } catch (e) {
        if (e instanceof Error && (e as any).code === 'ENOENT') {
            console.log('history.json not found, skipping.');
        } else {
            throw e;
        }
    }


    // 3. Quiz Sessions の移行
    console.log('\nMigrating quiz sessions...');
    const quizSessionsPath = path.join(process.cwd(), 'quiz_sessions.json');
    try {
        const quizSessionsData = await fs.readFile(quizSessionsPath, 'utf-8');
        const quizSessions: QuizSession[] = JSON.parse(quizSessionsData);
        const { error: sessionsError } = await supabase.from('quiz_sessions').upsert(quizSessions);
        if (sessionsError) {
        console.error('Error migrating quiz sessions:', sessionsError.message);
        } else {
        console.log(`Successfully migrated ${quizSessions.length} quiz sessions.`);
        }
    } catch (e) {
        if (e instanceof Error && (e as any).code === 'ENOENT') {
            console.log('quiz_sessions.json not found, skipping.');
        } else {
            throw e;
        }
    }


    console.log('\nData migration completed!');

  } catch (error) {
    if (error instanceof Error) {
        console.error('\nAn unexpected error occurred:', error.message);
    } else {
        console.error('\nAn unexpected and unknown error occurred.');
    }
    process.exit(1);
  }
}

main();
