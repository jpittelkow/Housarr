import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'
import { Icon, Sun, Moon, Monitor } from './Icon'

type ThemeMode = 'light' | 'dark' | 'auto'

const options: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'auto', icon: Monitor, label: 'System' },
]

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { mode, setMode } = useThemeStore()

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 transition-colors',
        className
      )}
    >
      {options.map(({ value, icon, label }) => {
        const isActive = mode === value
        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={cn(
              'flex items-center justify-center p-2 rounded-md transition-all duration-150',
              isActive
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
            title={label}
          >
            <Icon icon={icon} size="sm" />
          </button>
        )
      })}
    </div>
  )
}
