import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
      'transition-all duration-150 ease-out',
      'focus:outline-none focus-visible:ring-4',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      'active:scale-[0.98]'
    )

    const variants = {
      primary: 'bg-primary-600 text-white shadow-xs hover:bg-primary-700 focus-visible:ring-primary-100',
      secondary: 'bg-white text-gray-700 border border-gray-300 shadow-xs hover:bg-gray-50 hover:text-gray-800 focus-visible:ring-gray-100',
      tertiary: 'text-gray-600 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-gray-100',
      danger: 'bg-error-600 text-white shadow-xs hover:bg-error-700 focus-visible:ring-error-100',
      ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-gray-100',
      link: 'text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline focus-visible:ring-primary-100 p-0',
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm h-9',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-4.5 py-2.5 text-base h-11',
      xl: 'px-5 py-3 text-base h-12',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], variant !== 'link' && sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
