import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ApiAuthError, getRequestUser } from '@/lib/serverAuth';

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request);

    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user.id)
      .order('answered_at', { ascending: false });

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
    const newEntries = await request.json();

    if (!Array.isArray(newEntries)) {
      return NextResponse.json({ error: 'Request body must be an array of history entries.' }, { status: 400 });
    }

    if (newEntries.length === 0) {
      return NextResponse.json({ success: true, message: 'No new entries to add.' });
    }

    const entries = newEntries.map((entry) => ({ ...entry, user_id: user.id }));

    const { data, error } = await supabase
      .from('history')
      .insert(entries)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/history');
    revalidatePath('/add');

    return NextResponse.json({ success: true, data });
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

    const { error } = await supabase
      .from('history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/history');
    revalidatePath('/add');

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
