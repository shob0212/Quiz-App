"use client";

import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';

export function ConditionalBottomNav() {
  const pathname = usePathname();
  
  const shouldShowFooter = !pathname.startsWith('/quiz/play') && !pathname.startsWith('/quiz/results');

  if (!shouldShowFooter) {
    return null;
  }

  return <BottomNav />;
}
