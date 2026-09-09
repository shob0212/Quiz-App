import { Suspense } from 'react'
import LoginPageClient from './LoginPageClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageClient />
    </Suspense>
  )
}
