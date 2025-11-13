import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const questionsPath = path.join(process.cwd(), 'questions.json');

export async function GET() {
  try {
    const data = await fs.readFile(questionsPath, 'utf-8');
    const questions = JSON.parse(data);
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const questions = await request.json();
    await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write questions' }, { status: 500 });
  }
}
