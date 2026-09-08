import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import type { Question } from '@/lib/data';
import { ApiAuthError, getRequestUser } from '@/lib/serverAuth';

export async function GET() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    await getRequestUser(request);
    const questions = await request.json();

    const { error } = await supabase
      .from('questions')
      .upsert(questions);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await getRequestUser(request);
    const question: Question = await request.json();

    if (!question.id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const { created_at, ...updateData } = question;

    const { data, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', question.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Question not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await getRequestUser(request);
    const body = await request.json().catch(() => null);

    if (body && body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      const { error: historyError } = await supabase
        .from('history')
        .delete()
        .in('question_id', body.ids);

      if (historyError) {
        return NextResponse.json({ error: historyError.message }, { status: 500 });
      }

      const { error: notesError } = await supabase
        .from('question_notes')
        .delete()
        .in('question_id', body.ids);

      if (notesError) {
        return NextResponse.json({ error: notesError.message }, { status: 500 });
      }

      const { error: questionError } = await supabase
        .from('questions')
        .delete()
        .in('id', body.ids);

      if (questionError) {
        return NextResponse.json({ error: questionError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: body.ids.length });
    }

    return NextResponse.json({ error: 'Invalid request body. Expected { ids: string[] }' }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
