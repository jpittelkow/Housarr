import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | boolean
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    const hasError = Boolean(error)

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex w-full rounded-lg border bg-white px-3.5 py-2.5',
              'text-gray-900 text-sm shadow-xs',
              'placeholder:text-gray-500',
              'transition-all duration-150',
              'focus:outline-none focus:ring-4',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              hasError
                ? 'border-error-300 focus:border-error-300 focus:ring-error-100'
                : 'border-gray-300 focus:border-primary-300 focus:ring-primary-100',
              icon && 'pl-10',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {typeof error === 'string' && error && (
          <p className="mt-1.5 text-sm text-error-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
