import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChatWindow } from './ChatWindow'
import { Button } from '@/components/ui/Button'
import { Icon, MessageCircle, ChevronDown, ChevronUp, Sparkles, Trash2 } from '@/components/ui'
import { useChatStore } from '@/stores/chatStore'
import type { Item } from '@/types'

interface ItemChatProps {
  item: Item
  className?: string
}

export function ItemChat({ item, className = '' }: ItemChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Use global chat store
  const { messages, isLoading, contextInfo } = useChatStore((state) => state.getItemChat(item.id))
  const sendMessage = useChatStore((state) => state.sendMessage)

  // Fetch suggested questions
  const { data: suggestionsData } = useQuery({
    queryKey: ['chat-suggestions', item.id],
    queryFn: async () => {
      const { chat } = await import('@/services/api')
      return chat.getSuggestedQuestions(item.id)
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const handleSendMessage = (message: string) => {
    sendMessage(item.id, message)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        size="sm"
        className={`gap-2 ${className}`}
      >
        <Icon icon={MessageCircle} size="sm" />
        Ask AI
      </Button>
    )
  }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Icon icon={Sparkles} size="sm" className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Assistant</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.name}</p>
          </div>
          <Icon icon={ChevronUp} size="sm" className="text-gray-400" />
        </button>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <ChatWindow
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        suggestedQuestions={suggestionsData?.suggestions || []}
        title="AI Assistant"
        subtitle={`${item.make || ''} ${item.model || ''}`.trim() || item.name}
        contextInfo={contextInfo}
        onClose={() => setIsOpen(false)}
        placeholder={`Ask about your ${item.name}...`}
      />
    </div>
  )
}

// Collapsible version for embedding in item detail page
interface ItemChatPanelProps {
  item: Item
  defaultOpen?: boolean
  className?: string
}

export function ItemChatPanel({ item, defaultOpen = false, className = '' }: ItemChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen)
  
  // Use global chat store - this persists across navigation
  const { messages, isLoading, contextInfo } = useChatStore((state) => state.getItemChat(item.id))
  const sendMessage = useChatStore((state) => state.sendMessage)
  const clearHistory = useChatStore((state) => state.clearHistory)

  // Fetch suggested questions
  const { data: suggestionsData } = useQuery({
    queryKey: ['chat-suggestions', item.id],
    queryFn: async () => {
      const { chat } = await import('@/services/api')
      return chat.getSuggestedQuestions(item.id)
    },
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  })

  const handleSendMessage = (message: string) => {
    sendMessage(item.id, message)
  }

  const handleClearHistory = () => {
    clearHistory(item.id)
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center relative">
            <Icon icon={Sparkles} size="sm" className="text-white" />
            {isLoading && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-violet-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">AI Assistant</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading 
                ? 'Thinking...' 
                : messages.length > 0 
                  ? `${messages.length} messages` 
                  : 'Ask questions about this item'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !isLoading && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Clear chat history for this item?')) {
                  handleClearHistory()
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear chat history"
            >
              <Icon icon={Trash2} size="xs" />
            </span>
          )}
          <Icon 
            icon={isExpanded ? ChevronUp : ChevronDown} 
            size="sm" 
            className="text-gray-400" 
          />
        </div>
      </button>

      {/* Chat content - collapsible */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            suggestedQuestions={suggestionsData?.suggestions || []}
            contextInfo={contextInfo}
            showHeader={false}
            placeholder={`Ask about your ${item.name}...`}
            className="border-0 shadow-none rounded-none"
          />
        </div>
      )}
    </div>
  )
}
