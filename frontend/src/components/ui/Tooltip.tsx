import { useState, useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  position?: TooltipPosition
  className?: string
  iconClassName?: string
  children?: ReactNode
}

const positionStyles: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const arrowStyles: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
}

function Tooltip({ content, position = 'top', className, iconClassName, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipId] = useState(() => `tooltip-${Math.random().toString(36).substr(2, 9)}`)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsVisible(false)
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible])

  const trigger = children || (
    <HelpCircle
      className={cn(
        'h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help',
        iconClassName
      )}
    />
  )

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={isVisible ? tooltipId : undefined}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-full"
      >
        {trigger}
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg',
            'max-w-xs whitespace-normal',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            positionStyles[position]
          )}
        >
          {content}
          <span
            className={cn(
              'absolute border-4',
              arrowStyles[position]
            )}
          />
        </div>
      )}
    </span>
  )
}

interface HelpTooltipProps {
  children: ReactNode
  position?: TooltipPosition
  className?: string
}

function HelpTooltip({ children, position = 'top', className }: HelpTooltipProps) {
  return (
    <Tooltip content={children} position={position} className={className} />
  )
}

export { Tooltip, HelpTooltip }
