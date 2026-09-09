"use client"

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendPasswordResetEmail, signInWithEmail, signUpWithEmail } from '@/lib/data'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [message, setMessage] = useState<string | null>(null)

  const next = searchParams.get('next') || '/'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      if (mode === 'signup') {
        const data = await signUpWithEmail(email, password)
        if (data.session) {
          router.replace(next)
        } else {
          setPassword('')
          setMode('signin')
          setMessage('登録しました。メール確認後にログインしてください。')
        }
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(email)
        setMessage('パスワード再設定用のメールを送信しました。メール内のリンクから再設定してください。')
      } else {
        await signInWithEmail(email, password)
        router.replace(next)
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '処理に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const title = mode === 'signup' ? '新規登録' : mode === 'forgot' ? 'パスワード再設定' : 'ログイン'
  const submitLabel = mode === 'signup' ? '登録する' : mode === 'forgot' ? '再設定メールを送信' : 'ログインする'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 border-border">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">メール認証のみ対応しています。</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '処理中...' : submitLabel}
          </Button>
        </form>

        {mode === 'signin' && (
          <div className="text-center mt-3">
            <button
              type="button"
              className="text-sm text-primary underline underline-offset-4 hover:opacity-80"
              onClick={() => { setMode('forgot'); setMessage(null) }}
            >
              パスワードをお忘れですか？
            </button>
          </div>
        )}

        <div className="border-t border-border mt-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => { setMode(mode === 'signup' ? 'signin' : mode === 'forgot' ? 'signin' : 'signup'); setMessage(null) }}
          >
            {mode === 'signup' ? 'ログインへ戻る' : mode === 'forgot' ? 'ログインへ戻る' : '新規登録へ'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
