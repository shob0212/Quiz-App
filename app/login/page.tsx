"use client"

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInWithEmail, signUpWithEmail } from '@/lib/data'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const next = searchParams.get('next') || '/'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      if (isSignup) {
        await signUpWithEmail(email, password)
        setMessage('登録しました。メール確認後にログインしてください。')
      } else {
        await signInWithEmail(email, password)
        router.replace(next)
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'ログインに失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 border-border">
        <h1 className="text-2xl font-bold mb-2">{isSignup ? '新規登録' : 'ログイン'}</h1>
        <p className="text-sm text-muted-foreground mb-6">メール認証のみ対応しています。</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '処理中...' : isSignup ? '登録する' : 'ログインする'}
          </Button>
        </form>

        <Button variant="ghost" className="w-full mt-3" onClick={() => setIsSignup((v) => !v)}>
          {isSignup ? 'ログインへ戻る' : '新規登録へ'}
        </Button>
      </Card>
    </div>
  )
}
