import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ children, className, hover }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn('glass-card rounded-xl p-5', hover && 'hover:border-white/10 transition', className)}>
      {children}
    </div>
  )
}
