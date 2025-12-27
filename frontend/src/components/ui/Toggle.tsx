import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  size?: 'sm' | 'md'
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, size = 'md', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const sizes = {
      sm: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 'peer-checked:translate-x-4',
      },
      md: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 'peer-checked:translate-x-5',
      },
    }

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="peer sr-only"
            role="switch"
            {...props}
          />
          <div
            className={cn(
              'rounded-full bg-gray-200 transition-colors',
              'peer-focus-visible:ring-4 peer-focus-visible:ring-primary-100',
              'peer-checked:bg-primary-600',
              'peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed',
              sizes[size].track,
              className
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform',
                sizes[size].thumb,
                sizes[size].translate
              )}
            />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle }
