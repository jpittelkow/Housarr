import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChatWindow } from './ChatWindow'
import { Icon, MessageCircle, X, Sparkles, Minus } from '@/components/ui'
import { chat, type ChatMessage } from '@/services/api'

interface FloatingChatProps {
  className?: string
}

export function FloatingChat({ className = '' }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Check if chat is available
  const { data: availabilityData, isLoading: isCheckingAvailability } = useQuery({
    queryKey: ['chat-availability'],
    queryFn: () => chat.checkAvailability(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  })

  const handleSendMessage = async (message: string) => {
    const newMessages: ChatMessage[] = [...messages, { role: 'user' as const, content: message }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await chat.send(message, messages)
      
      if (response.success && response.response) {
        setMessages([...newMessages, { role: 'assistant' as const, content: response.response }])
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant' as const, content: response.error || 'Sorry, I encountered an error. Please try again.' }
        ])
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: 'assistant' as const, content: 'Sorry, I encountered an error. Please try again.' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if AI is not available
  if (isCheckingAvailability || !availabilityData?.available) {
    return null
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group ${className}`}
        title="Open AI Assistant"
      >
        <Icon icon={MessageCircle} size="md" className="text-white" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
      </button>
    )
  }

  // Minimized state - small bar at bottom
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow ${className}`}
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Icon icon={Sparkles} size="sm" className="text-white" />
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Assistant</span>
        {messages.length > 0 && (
          <span className="h-5 min-w-[1.25rem] px-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-medium rounded-full flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>
    )
  }

  // Expanded chat window
  return (
    <div className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] ${className}`}>
      <div className="relative">
        {/* Custom header with minimize button */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 rounded-t-xl border-b border-gray-200 dark:border-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <Icon icon={Sparkles} size="sm" className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">AI Assistant</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Home maintenance helper</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title="Minimize"
            >
              <Icon icon={Minus} size="sm" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title="Close"
            >
              <Icon icon={X} size="sm" />
            </button>
          </div>
        </div>
        
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          suggestedQuestions={[
            "What maintenance should I do this month?",
            "How do I troubleshoot common appliance issues?",
            "What's the typical lifespan of a water heater?",
            "How often should I service my HVAC?",
          ]}
          showHeader={false}
          placeholder="Ask about home maintenance..."
          className="pt-16 shadow-2xl"
        />
      </div>
    </div>
  )
}
