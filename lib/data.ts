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



export class AuthError extends Error {

  constructor(message?: string) {

    super(message);

    this.name = 'AuthError';

  }

}



async function handleResponse(res: Response): Promise<any> {

    if (res.status === 401) {

        throw new AuthError('Authentication failed');

    }

    if (!res.ok) {

        const errorBody = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));

        throw new Error(errorBody.error || `Request failed with status ${res.status}`);

    }

    if (res.headers.get('Content-Length') === '0' || !res.headers.get('Content-Type')?.includes('application/json')) {

        return null;

    }

    return res.json();

}





export async function getQuestions(): Promise<Question[]> {

  const res = await fetch('/api/questions');

  if (!res.ok) {

    throw new Error('Failed to fetch questions');

  }

  return res.json();

}



export async function updateQuestion(question: Partial<Question>): Promise<Question> {

  const res = await fetch(`/api/questions`, {

    method: 'PATCH',

    headers: {

      'Content-Type': 'application/json',

    },

    body: JSON.stringify(question),

  });

  return handleResponse(res);

}



export async function getHistory(): Promise<History[]> {

  const res = await fetch('/api/history');

  if (!res.ok) {

    throw new Error('Failed to fetch history');

  }

  return res.json();

}



export async function writeQuestions(questions: Question[]): Promise<void> {

  const res = await fetch('/api/questions', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

    },

    body: JSON.stringify(questions),

  });

  await handleResponse(res);

}



// 新しい履歴エントリ（単数または複数）を追加する

export async function writeHistory(newEntries: History | History[]): Promise<void> {

  const res = await fetch('/api/history', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

    },

    // サーバー側で配列として処理するため、単一オブジェクトも配列でラップする

    body: JSON.stringify(Array.isArray(newEntries) ? newEntries : [newEntries]),

  });

  await handleResponse(res);

}



// すべての履歴を削除する

export async function deleteHistory(): Promise<void> {

  const res = await fetch('/api/history', {

    method: 'DELETE',

  });

  await handleResponse(res);

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

  const res = await fetch('/api/quiz-sessions', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

    },

    body: JSON.stringify(newSessions),

  });

  await handleResponse(res);

}



// すべてのクイズセッションを削除する

export async function deleteQuizSessions(): Promise<void> {

  const res = await fetch('/api/quiz-sessions', {

    method: 'DELETE',

  });

  await handleResponse(res);

}
