import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  size?: 'sm' | 'md'
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, size = 'md', id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || generatedId

    const sizes = {
      sm: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translateOn: 'translate-x-4',
        translateOff: 'translate-x-0',
      },
      md: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translateOn: 'translate-x-5',
        translateOff: 'translate-x-0',
      },
    }

    // Use a more reliable approach with data attributes or direct checked state
    return (
      <div className="flex items-start gap-3">
        <label htmlFor={inputId} className="relative flex items-center cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="sr-only peer"
            role="switch"
            {...props}
          />
          {/* Track */}
          <div
            className={cn(
              'rounded-full bg-gray-200 dark:bg-gray-600 transition-colors',
              'peer-focus-visible:ring-4 peer-focus-visible:ring-primary-100',
              'peer-checked:bg-primary-600',
              'peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed',
              sizes[size].track,
              className
            )}
          />
          {/* Thumb */}
          <div
            className={cn(
              'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform',
              'peer-checked:translate-x-4',
              size === 'md' && 'peer-checked:translate-x-5',
              sizes[size].thumb
            )}
          />
        </label>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
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

Toggle.displayName = 'Toggle'

export { Toggle }
