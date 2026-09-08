"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { getCurrentUser, getProfile, runLegacyMigrationToCurrentAdmin, signOut, updateProfile, UserProfile } from '@/lib/data'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState<string>('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [user, p] = await Promise.all([getCurrentUser(), getProfile()])
        setEmail(user?.email || '')
        setProfile(p)
        setDisplayName(p.display_name || '')
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'プロフィール取得に失敗しました。')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const onSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const updated = await updateProfile(displayName)
      setProfile(updated)
      setMessage('プロフィールを更新しました。')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '更新に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }

  const onMigrate = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const result = await runLegacyMigrationToCurrentAdmin()
      setMessage(`移行完了: ${JSON.stringify(result.result ?? result)}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '移行に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }

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
            <p className="text-sm text-muted-foreground">ユーザー情報と移行管理</p>
          </div>
        </div>

        <Card className="p-6 border-border space-y-4">
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input value={email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">表示名</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} disabled={isSaving}>表示名を保存</Button>
            <Button variant="outline" onClick={onMigrate} disabled={isSaving}>既存履歴/解説をadminへ移行</Button>
            <Button variant="destructive" onClick={onLogout}>ログアウト</Button>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {profile && <p className="text-xs text-muted-foreground">User ID: {profile.id}</p>}
        </Card>
      </div>
    </div>
  )
}
