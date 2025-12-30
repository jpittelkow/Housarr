import { createContext, useContext, useState, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Icon } from './Icon'

// ============ Simple Tabs (for Settings page) ============

export interface Tab {
  id: string
  label: string
  icon?: LucideIcon
  badge?: string | number
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700', className)}>
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'group inline-flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && (
                <Icon
                  icon={tab.icon}
                  size="sm"
                  className={cn(
                    isActive
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                  )}
                />
              )}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    isActive
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ============ Compound Tabs (for Reminders/Todos pages) ============

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs compound components must be used within TabsRoot')
  }
  return context
}

interface TabsRootProps {
  children: ReactNode
  defaultValue: string
  onChange?: (value: string) => void
  className?: string
}

export function TabsRoot({ children, defaultValue, onChange, className }: TabsRootProps) {
  const [activeTab, setActiveTabState] = useState(defaultValue)

  const setActiveTab = (value: string) => {
    setActiveTabState(value)
    onChange?.(value)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700', className)}>
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {children}
      </nav>
    </div>
  )
}

interface TabProps {
  children: ReactNode
  value: string
  className?: string
}

export function Tab({ children, value, className }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext()
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        'border-b-2 py-3 px-1 text-sm font-medium transition-colors',
        isActive
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
        className
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </button>
  )
}

interface TabPanelProps {
  children: ReactNode
  value: string
  className?: string
}

export function TabPanel({ children, value, className }: TabPanelProps) {
  const { activeTab } = useTabsContext()
  
  if (activeTab !== value) {
    return null
  }

  return <div className={cn('pt-6', className)}>{children}</div>
}
