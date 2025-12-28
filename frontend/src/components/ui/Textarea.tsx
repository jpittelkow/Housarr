import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'block w-full rounded-lg border bg-white dark:bg-gray-800 px-3.5 py-2.5 text-gray-900 dark:text-gray-100 shadow-xs placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'focus:outline-none focus-visible:ring-4 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400',
            'resize-y min-h-[80px]',
            error
              ? 'border-error-300 dark:border-error-700 focus-visible:border-error-300 dark:focus-visible:border-error-600 focus-visible:ring-error-100 dark:focus-visible:ring-error-900/30'
              : 'border-gray-300 dark:border-gray-700 focus-visible:border-primary-300 dark:focus-visible:border-primary-600 focus-visible:ring-primary-100 dark:focus-visible:ring-primary-900/30',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p className={cn('mt-1.5 text-sm', error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400')}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
