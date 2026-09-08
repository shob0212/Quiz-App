import { supabase } from '@/lib/supabaseClient'

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
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    throw new ApiAuthError('Authentication failed', 401)
  }

  return data.user
}
