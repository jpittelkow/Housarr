import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { address, type AddressSuggestion } from '@/services/api'
import { cn } from '@/lib/utils'
import { Icon, MapPin, Loader2 } from '@/components/ui'

export interface AddressInputProps {
  value: string
  onChange: (value: string, suggestion?: AddressSuggestion) => void
  label?: string
  placeholder?: string
  hint?: string
  error?: string | boolean
  disabled?: boolean
  countrycodes?: string
  className?: string
}

export function AddressInput({
  value,
  onChange,
  label,
  placeholder = 'Start typing an address...',
  hint,
  error,
  disabled,
  countrycodes,
  className,
}: AddressInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasError = Boolean(error)

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Debounce the search query (300ms minimum for Nominatim rate limiting)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.length >= 3) {
        setDebouncedQuery(inputValue)
      } else {
        setDebouncedQuery('')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue])

  // Query for address suggestions
  const { data, isLoading } = useQuery({
    queryKey: ['address-autocomplete', debouncedQuery, countrycodes],
    queryFn: () => address.autocomplete(debouncedQuery, 5, countrycodes),
    enabled: debouncedQuery.length >= 3 && isOpen,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const suggestions = data?.suggestions || []

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelect(suggestions[highlightedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    },
    [isOpen, suggestions, highlightedIndex]
  )

  const handleSelect = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.display_name)
    onChange(suggestion.display_name, suggestion)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)
    // Only call onChange with the raw text (no suggestion)
    onChange(newValue)
  }

  const handleFocus = () => {
    if (inputValue.length >= 3) {
      setIsOpen(true)
    }
  }

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          {isLoading ? (
            <Icon icon={Loader2} size="xs" className="animate-spin" />
          ) : (
            <Icon icon={MapPin} size="xs" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'flex w-full rounded-lg border bg-white dark:bg-gray-800 pl-10 pr-3.5 py-2.5',
            'text-gray-900 dark:text-gray-100 text-sm shadow-xs',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'transition-all duration-150',
            'focus:outline-none focus:ring-4',
            'disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed',
            hasError
              ? 'border-error-300 dark:border-error-700 focus:border-error-300 dark:focus:border-error-600 focus:ring-error-100 dark:focus:ring-error-900'
              : 'border-gray-300 dark:border-gray-700 focus:border-primary-300 dark:focus:border-primary-600 focus:ring-primary-100 dark:focus:ring-primary-900'
          )}
        />

        {/* Suggestions dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id || index}
                type="button"
                className={cn(
                  'w-full px-4 py-3 text-left text-sm transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700',
                  index === highlightedIndex && 'bg-gray-50 dark:bg-gray-700'
                )}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-start gap-3">
                  <Icon icon={MapPin} size="xs" className="mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-gray-100 truncate">
                      {formatMainAddress(suggestion)}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">
                      {formatSecondaryAddress(suggestion)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {isOpen && debouncedQuery.length >= 3 && !isLoading && suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No addresses found. Try a different search.
            </p>
          </div>
        )}
      </div>

      {typeof error === 'string' && error && (
        <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  )
}

// Helper functions to format address display
function formatMainAddress(suggestion: AddressSuggestion): string {
  const parts: string[] = []
  const addr = suggestion.address

  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`)
  } else if (addr.road) {
    parts.push(addr.road)
  }

  if (addr.city) {
    parts.push(addr.city)
  }

  return parts.length > 0 ? parts.join(', ') : suggestion.display_name.split(',')[0]
}

function formatSecondaryAddress(suggestion: AddressSuggestion): string {
  const parts: string[] = []
  const addr = suggestion.address

  if (addr.state) {
    parts.push(addr.state)
  }
  if (addr.postcode) {
    parts.push(addr.postcode)
  }
  if (addr.country && addr.country_code !== 'us') {
    parts.push(addr.country)
  }

  return parts.join(', ')
}
