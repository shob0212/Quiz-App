import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const historyPath = path.join(process.cwd(), 'history.json');

export async function GET() {
  try {
    const data = await fs.readFile(historyPath, 'utf-8');
    const history = JSON.parse(data);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const history = await request.json();
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write history' }, { status: 500 });
  }
}
