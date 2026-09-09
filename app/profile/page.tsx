"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { getCurrentUser, getProfile, signOut, UserProfile } from '@/lib/data'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [user, p] = await Promise.all([getCurrentUser(), getProfile()])
        setEmail(user?.email || '')
        setProfile(p)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'プロフィール取得に失敗しました。')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const onLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">プロフィール</h1>
            <p className="text-sm text-muted-foreground">ユーザー情報</p>
          </div>
        </div>

        <Card className="p-6 border-border space-y-4">
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input value={email} disabled />
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {profile && <p className="text-xs text-muted-foreground">User ID: {profile.id}</p>}

          <Button variant="destructive" size="lg" className="w-full" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </Card>
      </div>
    </div>
  )
}
