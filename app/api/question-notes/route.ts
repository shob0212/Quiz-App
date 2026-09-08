import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { ApiAuthError, getRequestUser } from '@/lib/serverAuth'

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('question_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? null)
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getRequestUser(request)
    const body = await request.json()

    if (!body?.question_id) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }

    const payload = {
      user_id: user.id,
      question_id: body.question_id,
      note: typeof body.note === 'string' ? body.note : null,
    }

    const { data, error } = await supabase
      .from('question_notes')
      .upsert(payload, { onConflict: 'user_id,question_id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 })
  }
}
