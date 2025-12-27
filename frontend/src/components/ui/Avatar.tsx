import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  fallback?: string
}

const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, size = 'md', src, alt, fallback, ...props }, ref) => {
    const sizes = {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-14 w-14 text-lg',
      '2xl': 'h-16 w-16 text-xl',
    }

    if (!src && fallback) {
      return (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-primary-100 font-medium text-primary-700',
            sizes[size],
            className
          )}
        >
          {fallback}
        </div>
      )
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn('inline-block rounded-full object-cover', sizes[size], className)}
        {...props}
      />
    )
  }
)

Avatar.displayName = 'Avatar'

export { Avatar }
