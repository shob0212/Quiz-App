import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .order('finished_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 新しいクイズセッションを追加するためのPOST
export async function POST(request: Request) {
  try {
    const newSession = await request.json();

    // 配列で渡された場合にも対応
    const sessionsToInsert = Array.isArray(newSession) ? newSession : [newSession];

    if (sessionsToInsert.length === 0) {
        return NextResponse.json({ success: true, message: 'No new sessions to add.' });
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .insert(sessionsToInsert);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 関連ページのキャッシュを無効化
    revalidatePath('/history');

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

// クイズセッションを削除するためのDELETE
export async function DELETE(request: Request) {
    try {
        // ボディを試みとしてJSONパースする。ボディがない場合はnullになる
        const body = await request.json().catch(() => null);

        // パターン1: bodyに 'ids' があり、それが配列で空でない場合、選択削除
        if (body && body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
            const { error } = await supabase
                .from('quiz_sessions')
                .delete()
                .in('id', body.ids);

            if (error) {
                console.error('Supabase error (selective delete):', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        } 
        // パターン2: bodyがない、またはidsがない場合、全件削除（既存のロジック）
        else {
            const { error } = await supabase
                .from('quiz_sessions')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // ダミーの条件で全件削除

            if (error) {
                console.error('Supabase error (delete all):', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }
        
        // 関連ページのキャッシュを無効化
        revalidatePath('/history');

        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof Error) {
            return NextResponse.json({ error: e.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
