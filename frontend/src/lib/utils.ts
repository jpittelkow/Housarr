import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cached formatters for better performance - avoid creating new instances on every call
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date))
}

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Extract a user-friendly error message from an API error response.
 * Handles various error formats including:
 * - Laravel validation errors (errors object with field arrays)
 * - Standard message property
 * - Error property
 * - Axios error message
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'An error occurred'
): string {
  if (!error) return fallback
  
  // Type guard for axios-like error structure
  const err = error as {
    response?: {
      data?: {
        message?: string
        error?: string
        errors?: Record<string, string[]>
      }
    }
    message?: string
  }
  
  // Laravel validation errors - flatten all field errors
  if (err.response?.data?.errors) {
    const errors = Object.values(err.response.data.errors).flat()
    if (errors.length > 0) {
      return errors.join('. ')
    }
  }
  
  // Standard error message formats
  if (err.response?.data?.message) {
    return err.response.data.message
  }
  
  if (err.response?.data?.error) {
    return err.response.data.error
  }
  
  // Axios/fetch error message
  if (err.message) {
    return err.message
  }
  
  return fallback
}

/**
 * Detect if the current device is a mobile/touch device.
 * Used for showing camera capture buttons on mobile.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
}
