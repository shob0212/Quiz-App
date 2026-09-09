import { createRequestScopedClient } from '@/lib/supabaseClient'

export class ApiAuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = 'ApiAuthError'
    this.status = status
  }
}

export async function getRequestUser(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiAuthError('Missing access token', 401)
  }

  const token = authHeader.slice('Bearer '.length)
  const supabase = createRequestScopedClient(token)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    throw new ApiAuthError('Authentication failed', 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', data.user.id)
    .maybeSingle()

  const isAdmin = profile?.display_name?.trim().toLowerCase() === 'admin'

  return { user: data.user, supabase, isAdmin }
}
