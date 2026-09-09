"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabaseClient'

type Status = 'checking' | 'success' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let isMounted = true

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (session) {
        setStatus('success')
        setTimeout(() => router.replace('/'), 1500)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted && data.session) {
        setStatus('success')
        setTimeout(() => router.replace('/'), 1500)
      }
    })

    const timer = setTimeout(() => {
      if (isMounted) {
        setStatus((current) => (current === 'checking' ? 'error' : current))
      }
    }, 4000)

    return () => {
      isMounted = false
      clearTimeout(timer)
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 border-border text-center space-y-4">
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">メール確認を処理しています...</p>
          </div>
        )}
        {status === 'success' && (
          <p className="text-sm text-muted-foreground">確認が完了しました。まもなくホームへ移動します。</p>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              確認リンクが無効か期限切れです。ログイン画面からやり直してください。
            </p>
            <Button className="w-full" onClick={() => router.replace('/login')}>
              ログイン画面へ
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
