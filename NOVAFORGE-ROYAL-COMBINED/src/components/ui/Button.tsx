import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#1a5f9e] hover:bg-[#0d3d6e] text-white shadow-lg shadow-blue-900/20 border border-[#c9a227]/40',
      secondary: 'bg-[#a8d4e6] hover:bg-[#7eb8d4] text-[#2c241c]',
      ghost: 'bg-transparent hover:bg-[rgba(26,95,158,0.08)] text-[#1a5f9e]',
      outline: 'border border-[#1a5f9e]/25 hover:border-[#c9a227] text-[#0f1b2d] hover:bg-[rgba(201,162,39,0.1)]',
    }
    const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
