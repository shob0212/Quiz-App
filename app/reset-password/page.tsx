"use client"

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabaseClient'
import { updatePassword } from '@/lib/data'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setStatus('ready')
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted && data.session) {
        setStatus('ready')
      }
    })

    const timer = setTimeout(() => {
      if (isMounted) {
        setStatus((current) => (current === 'checking' ? 'invalid' : current))
      }
    }, 4000)

    return () => {
      isMounted = false
      clearTimeout(timer)
      authListener.subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password.length < 6) {
      setMessage('パスワードは6文字以上で入力してください。')
      return
    }
    if (password !== confirmPassword) {
      setMessage('パスワードが一致しません。')
      return
    }

    setIsLoading(true)
    try {
      await updatePassword(password)
      setStatus('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 border-border">
        <h1 className="text-2xl font-bold mb-2">パスワード再設定</h1>

        {status === 'checking' && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Spinner size="sm" />
            確認しています...
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              リンクが無効か期限切れです。もう一度パスワード再設定をリクエストしてください。
            </p>
            <Button className="w-full" onClick={() => router.replace('/login')}>
              ログイン画面へ戻る
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '処理中...' : 'パスワードを更新'}
            </Button>
          </form>
        )}

        {status === 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">パスワードを更新しました。</p>
            <Button className="w-full" onClick={() => router.replace('/')}>
              ホームへ進む
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
