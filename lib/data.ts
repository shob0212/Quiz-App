import { supabase } from '@/lib/supabaseClient';

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
  is_exam_mode?: boolean;
  unscored_question_ids?: string[];
  correct_rate_excluding_unscored?: number;
  pass?: boolean;
  pass_threshold?: number;
  exam_duration_seconds?: number;
}

export interface QuestionNote {
  id: string;
  user_id: string;
  question_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export class AuthError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new AuthError(error.message);
  }
  return data.session?.access_token ?? null;
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers || {});

  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  return fetch(url, {
    ...init,
    headers,
  });
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

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new AuthError(error.message);
  return data.user;
}

export async function getQuestions(): Promise<Question[]> {
  const res = await fetch('/api/questions');
  if (!res.ok) {
    throw new Error('Failed to fetch questions');
  }
  return res.json();
}

export async function getHistory(): Promise<History[]> {
  const res = await authFetch('/api/history');
  return handleResponse(res);
}

export async function writeQuestions(questions: Question[]): Promise<void> {
  const res = await authFetch('/api/questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(questions),
  });

  await handleResponse(res);
}

export async function writeHistory(newEntries: History | History[]): Promise<void> {
  const res = await authFetch('/api/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(Array.isArray(newEntries) ? newEntries : [newEntries]),
  });

  await handleResponse(res);
}

export async function deleteHistory(): Promise<void> {
  const res = await authFetch('/api/history', {
    method: 'DELETE',
  });

  await handleResponse(res);
}

export async function getQuizSessions(): Promise<QuizSession[]> {
  const res = await authFetch('/api/quiz-sessions');
  return handleResponse(res);
}

export async function writeQuizSessions(newSessions: QuizSession | QuizSession[]): Promise<void> {
  const res = await authFetch('/api/quiz-sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newSessions),
  });

  await handleResponse(res);
}

export async function deleteQuizSessions(): Promise<void> {
  const res = await authFetch('/api/quiz-sessions', {
    method: 'DELETE',
  });

  await handleResponse(res);
}

export async function deleteQuestions(questionIds: string[]): Promise<void> {
  const res = await authFetch('/api/questions', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: questionIds }),
  });
  await handleResponse(res);
}

export async function getQuestionNote(questionId: string): Promise<QuestionNote | null> {
  const res = await authFetch(`/api/question-notes?questionId=${encodeURIComponent(questionId)}`);
  return handleResponse(res);
}

export async function upsertQuestionNote(questionId: string, note: string): Promise<QuestionNote> {
  const res = await authFetch('/api/question-notes', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question_id: questionId, note }),
  });

  return handleResponse(res);
}

export async function getProfile(): Promise<UserProfile> {
  const res = await authFetch('/api/profile');
  return handleResponse(res);
}

