import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { ConditionalBottomNav } from '@/components/layout/conditional-bottom-nav'
import { AuthGate } from '@/components/layout/auth-gate'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <AuthGate />
        </Suspense>
        <main className="pb-20">{children}</main>
        <ConditionalBottomNav />
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}