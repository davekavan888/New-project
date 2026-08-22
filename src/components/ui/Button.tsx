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
      primary: 'bg-[#6b4f3a] hover:bg-[#4a3428] text-[#fffdf9] shadow-lg shadow-brown-900/20 border border-[#4a3428]/30',
      secondary: 'bg-[#a8d4e6] hover:bg-[#7eb8d4] text-[#2c241c]',
      ghost: 'bg-transparent hover:bg-[#a8d4e6]/30 text-[#4a3428]',
      outline: 'border border-[#6b4f3a]/30 hover:border-[#5a9a4c] text-[#4a3428] hover:bg-[#7cbc6e]/15',
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
