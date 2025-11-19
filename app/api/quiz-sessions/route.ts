import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const quizSessionsPath = path.join(process.cwd(), 'quiz_sessions.json');

export async function GET() {
  try {
    const data = await fs.readFile(quizSessionsPath, 'utf-8');
    const quizSessions = JSON.parse(data);
    return NextResponse.json(quizSessions);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If file does not exist, return an empty array
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Failed to read quiz sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const quizSessions = await request.json();
    await fs.writeFile(quizSessionsPath, JSON.stringify(quizSessions, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write quiz sessions' }, { status: 500 });
  }
}
