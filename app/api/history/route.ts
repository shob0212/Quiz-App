import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('answered_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 新しい履歴エントリを追加するためのPOST
export async function POST(request: Request) {
  try {
    const newEntries = await request.json();

    // newEntriesが配列でなければエラー
    if (!Array.isArray(newEntries)) {
      return NextResponse.json({ error: 'Request body must be an array of history entries.' }, { status: 400 });
    }
    
    // 空の配列の場合は何もしない
    if (newEntries.length === 0) {
      return NextResponse.json({ success: true, message: 'No new entries to add.' });
    }

    const { error } = await supabase
      .from('history')
      .insert(newEntries);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // 関連ページのキャッシュを無効化
    revalidatePath('/history');
    revalidatePath('/add');


    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

// 全ての履歴を削除するためのDELETE
export async function DELETE() {
    try {
        const { error } = await supabase
            .from('history')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // ダミーの条件で全件削除

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        // 関連ページのキャッシュを無効化
        revalidatePath('/history');
        revalidatePath('/add');

        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof Error) {
            return NextResponse.json({ error: e.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
