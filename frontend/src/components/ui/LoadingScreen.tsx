import { useState, useEffect } from 'react'
import { Icon, Home } from '@/components/ui'

const funMessages = [
  'Loading...',
  'Combobulating...',
  'Getting the rocket ready for blast off...',
  'Polishing the pixels...',
  'Waking up the hamsters...',
  'Reticulating splines...',
  'Brewing coffee...',
  'Finding your stuff...',
  'Calibrating the flux capacitor...',
  'Almost there...',
]

interface LoadingScreenProps {
  /** Callback when loading animation is complete */
  onComplete?: () => void
  /** Duration before calling onComplete (ms) */
  duration?: number
  /** Custom title to display */
  title?: string
}

export function LoadingScreen({ 
  onComplete, 
  duration = 2000,
  title = 'Welcome back!'
}: LoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [isExiting, setIsExiting] = useState(false)

  // Rotate through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % funMessages.length)
    }, 600)

    return () => clearInterval(interval)
  }, [])

  // Trigger completion after duration
  useEffect(() => {
    if (!onComplete) return

    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300) // Start exit animation 300ms before completion

    const completeTimer = setTimeout(() => {
      onComplete()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete, duration])

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center 
        bg-gray-50 dark:bg-gray-950 transition-opacity duration-300
        ${isExiting ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Logo and Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center animate-pulse">
          <Icon icon={Home} size="lg" className="text-white" />
        </div>
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">Housarr</span>
      </div>

      {/* Title */}
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-6">
        {title}
      </h1>

      {/* Animated Spinner */}
      <div className="relative mb-8">
        {/* Outer ring */}
        <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-gray-800" />
        {/* Spinning segment */}
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary-600 animate-spin" />
        {/* Inner pulse */}
        <div className="absolute inset-2 w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 animate-pulse" />
      </div>

      {/* Rotating Fun Message */}
      <div className="h-8 flex items-center justify-center">
        <p 
          key={messageIndex}
          className="text-lg text-gray-600 dark:text-gray-400 animate-fade-in"
        >
          {funMessages[messageIndex]}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-600 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
