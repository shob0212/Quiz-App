import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ApiAuthError, getRequestUser } from '@/lib/serverAuth';

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request);

    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('finished_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request);
    const newSession = await request.json();
    const sessionsToInsert = (Array.isArray(newSession) ? newSession : [newSession]).map((session) => ({
      ...session,
      user_id: user.id,
    }));

    if (sessionsToInsert.length === 0) {
      return NextResponse.json({ success: true, message: 'No new sessions to add.' });
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .insert(sessionsToInsert);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/history');

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

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request);
    const body = await request.json().catch(() => null);

    if (body && body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      const { error } = await supabase
        .from('quiz_sessions')
        .delete()
        .eq('user_id', user.id)
        .in('id', body.ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('quiz_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    revalidatePath('/history');

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
