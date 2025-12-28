import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from './Icon'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'h-5 w-5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors',
              'peer-focus-visible:ring-4 peer-focus-visible:ring-primary-100 dark:peer-focus-visible:ring-primary-900/30 peer-focus-visible:border-primary-300 dark:peer-focus-visible:border-primary-600',
              'peer-checked:bg-primary-600 peer-checked:border-primary-600 dark:peer-checked:bg-primary-500 dark:peer-checked:border-primary-500',
              'peer-disabled:bg-gray-100 dark:peer-disabled:bg-gray-900 peer-disabled:cursor-not-allowed',
              className
            )}
          >
            <Check className="h-5 w-5 text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
