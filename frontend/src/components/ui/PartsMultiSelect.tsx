import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Icon, X, Search, Check } from '@/components/ui'
import type { Part } from '@/types'

interface PartsMultiSelectProps {
  label?: string
  parts: Part[]
  selectedPartIds: number[]
  onChange: (partIds: number[]) => void
  placeholder?: string
  hint?: string
}

export function PartsMultiSelect({
  label,
  parts,
  selectedPartIds,
  onChange,
  placeholder = 'Search and select parts...',
  hint,
}: PartsMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredParts = parts.filter((part) =>
    part.name.toLowerCase().includes(search.toLowerCase()) ||
    (part.part_number && part.part_number.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedParts = parts.filter((part) => selectedPartIds.includes(part.id))

  const togglePart = (partId: number) => {
    if (selectedPartIds.includes(partId)) {
      onChange(selectedPartIds.filter((id) => id !== partId))
    } else {
      onChange([...selectedPartIds, partId])
    }
  }

  const removePart = (partId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedPartIds.filter((id) => id !== partId))
  }

  // Group parts by type
  const replacementParts = filteredParts.filter((p) => p.type === 'replacement')
  const consumableParts = filteredParts.filter((p) => p.type === 'consumable')

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          {label}
        </label>
      )}

      {/* Selected parts pills */}
      {selectedParts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedParts.map((part) => (
            <span
              key={part.id}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                part.type === 'replacement'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              )}
            >
              {part.name}
              {part.part_number && (
                <span className="text-[10px] opacity-70">({part.part_number})</span>
              )}
              <button
                type="button"
                onClick={(e) => removePart(part.id, e)}
                className="ml-0.5 hover:opacity-70"
              >
                <Icon icon={X} size="xs" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          <Icon icon={Search} size="xs" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'flex w-full rounded-lg border bg-white dark:bg-gray-800 pl-10 pr-3.5 py-2.5',
            'text-gray-900 dark:text-gray-100 text-sm shadow-xs',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'transition-all duration-150',
            'focus:outline-none focus:ring-4',
            'border-gray-300 dark:border-gray-700 focus:border-primary-300 dark:focus:border-primary-600 focus:ring-primary-100 dark:focus:ring-primary-900'
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-auto">
          {filteredParts.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {parts.length === 0 ? 'No parts available for this item' : 'No parts match your search'}
            </div>
          ) : (
            <>
              {/* Replacement Parts Section */}
              {replacementParts.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                    Replacement Parts
                  </div>
                  {replacementParts.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => togglePart(part.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                        selectedPartIds.includes(part.id) && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          selectedPartIds.includes(part.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {selectedPartIds.includes(part.id) && (
                          <Icon icon={Check} size="xs" className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {part.name}
                        </div>
                        {part.part_number && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {part.part_number}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Consumable Parts Section */}
              {consumableParts.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                    Consumable Parts
                  </div>
                  {consumableParts.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => togglePart(part.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                        selectedPartIds.includes(part.id) && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          selectedPartIds.includes(part.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {selectedPartIds.includes(part.id) && (
                          <Icon icon={Check} size="xs" className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {part.name}
                        </div>
                        {part.part_number && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {part.part_number}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {hint && (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  )
}
