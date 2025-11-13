"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, Target, BarChart3 } from "lucide-react"

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/quiz", label: "出題", icon: Target },
  { href: "/add", label: "管理", icon: List },
  { href: "/history", label: "履歴", icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
