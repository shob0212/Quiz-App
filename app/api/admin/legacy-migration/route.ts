import { NextResponse } from 'next/server'
import { ApiAuthError, getRequestUser } from '@/lib/serverAuth'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getRequestUser(request)
    const email = user.email ?? ''

    if (!email.toLowerCase().startsWith('admin')) {
      return NextResponse.json({ error: 'Only admin user can run migration' }, { status: 403 })
    }

    const { data, error } = await supabase.rpc('migrate_legacy_data_to_user', {
      target_user_id: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, result: data })
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
