
export interface Question {
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

export interface History {
  id: string;
  result: boolean;
  answered_at: string;
  question_id: string;
  quiz_session_id: string;
  user_answers: number[];
}

export interface QuizSession {
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

export async function getQuestions(): Promise<Question[]> {
  const res = await fetch('/api/questions');
  if (!res.ok) {
    throw new Error('Failed to fetch questions');
  }
  return res.json();
}

export async function getHistory(): Promise<History[]> {
  const res = await fetch('/api/history');
  if (!res.ok) {
    throw new Error('Failed to fetch history');
  }
  return res.json();
}

export async function writeQuestions(questions: Question[]): Promise<void> {
  await fetch('/api/questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(questions),
  });
}

// 新しい履歴エントリ（単数または複数）を追加する
export async function writeHistory(newEntries: History | History[]): Promise<void> {
  await fetch('/api/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // サーバー側で配列として処理するため、単一オブジェクトも配列でラップする
    body: JSON.stringify(Array.isArray(newEntries) ? newEntries : [newEntries]),
  });
}

// すべての履歴を削除する
export async function deleteHistory(): Promise<void> {
  await fetch('/api/history', {
    method: 'DELETE',
  });
}

export async function getQuizSessions(): Promise<QuizSession[]> {
  const res = await fetch('/api/quiz-sessions');
  if (!res.ok) {
    throw new Error('Failed to fetch quiz sessions');
  }
  return res.json();
}

// 新しいクイズセッション（単数または複数）を追加する
export async function writeQuizSessions(newSessions: QuizSession | QuizSession[]): Promise<void> {
  await fetch('/api/quiz-sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newSessions),
  });
}

// すべてのクイズセッションを削除する
export async function deleteQuizSessions(): Promise<void> {
  await fetch('/api/quiz-sessions', {
    method: 'DELETE',
  });
}
