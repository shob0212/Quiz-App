"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const PUBLIC_PATHS = new Set(['/login', '/reset-password', '/auth/callback'])
// Paths that should bounce an already-authenticated user away.
// /reset-password and /auth/callback intentionally end up with a session
// (recovery / email confirmation) and manage their own redirect, so they're
// excluded here to avoid AuthGate racing them out before they can finish.
const REDIRECT_IF_AUTHED_PATHS = new Set(['/login'])

export function AuthGate() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      const isPublic = PUBLIC_PATHS.has(pathname)

      if (!isPublic && !data.session) {
        const nextPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
      }

      if (isMounted) {
        setIsChecked(true)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const isPublic = PUBLIC_PATHS.has(pathname)

      if (!isPublic && !session) {
        const nextPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
      }

      if (REDIRECT_IF_AUTHED_PATHS.has(pathname) && session) {
        const next = searchParams.get('next') || '/'
        router.replace(next)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router, searchParams])

  if (!isChecked && !PUBLIC_PATHS.has(pathname)) {
    return <div className="fixed inset-0 bg-background" />
  }

  return null
}
