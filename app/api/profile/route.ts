import { NextResponse } from 'next/server'
import { ApiAuthError, getRequestUser } from '@/lib/serverAuth'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      const profile = {
        id: user.id,
        email: user.email ?? null,
        display_name: null,
      }
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .upsert(profile)
        .select('*')
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json(created)
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

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request)
    const body = await request.json()

    const profile = {
      id: user.id,
      email: user.email ?? null,
      display_name: typeof body.display_name === 'string' ? body.display_name : null,
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
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
