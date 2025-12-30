import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon, Loader2, Send, X, Sparkles, FileText, Wrench, Clock } from '@/components/ui'
import type { ChatMessage } from '@/services/api'

interface ChatWindowProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  suggestedQuestions?: string[]
  onSuggestedQuestionClick?: (question: string) => void
  placeholder?: string
  title?: string
  subtitle?: string
  contextInfo?: {
    manualsIncluded?: number
    serviceHistoryIncluded?: number
    partsIncluded?: number
  }
  onClose?: () => void
  showHeader?: boolean
  className?: string
}

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading = false,
  suggestedQuestions = [],
  onSuggestedQuestionClick,
  placeholder = 'Ask a question...',
  title = 'AI Assistant',
  subtitle,
  contextInfo,
  onClose,
  showHeader = true,
  className = '',
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSuggestedClick = (question: string) => {
    if (onSuggestedQuestionClick) {
      onSuggestedQuestionClick(question)
    } else {
      onSendMessage(question)
    }
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <Icon icon={Sparkles} size="sm" className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Context indicators */}
            {contextInfo && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {contextInfo.manualsIncluded !== undefined && contextInfo.manualsIncluded > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    <Icon icon={FileText} size="xs" />
                    {contextInfo.manualsIncluded} manual{contextInfo.manualsIncluded !== 1 ? 's' : ''}
                  </span>
                )}
                {contextInfo.serviceHistoryIncluded !== undefined && contextInfo.serviceHistoryIncluded > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                    <Icon icon={Clock} size="xs" />
                    {contextInfo.serviceHistoryIncluded} log{contextInfo.serviceHistoryIncluded !== 1 ? 's' : ''}
                  </span>
                )}
                {contextInfo.partsIncluded !== undefined && contextInfo.partsIncluded > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                    <Icon icon={Wrench} size="xs" />
                    {contextInfo.partsIncluded} part{contextInfo.partsIncluded !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <Icon icon={X} size="sm" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-3">
              <Icon icon={Sparkles} size="md" className="text-violet-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Ask me anything about your product
            </p>
            {suggestedQuestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.slice(0, 4).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedClick(question)}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-violet-500 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon icon={Loader2} size="sm" className="text-violet-500 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick suggestions when there are messages */}
      {messages.length > 0 && suggestedQuestions.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedClick(question)}
                className="flex-shrink-0 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full transition-colors whitespace-nowrap"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="w-full px-4 py-2.5 pr-12 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!inputValue.trim() || isLoading}
            className="rounded-xl h-10 w-10 p-0 flex items-center justify-center bg-violet-500 hover:bg-violet-600"
          >
            {isLoading ? (
              <Icon icon={Loader2} size="sm" className="animate-spin" />
            ) : (
              <Icon icon={Send} size="sm" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Re-export Send icon for use in other components
export { Send }
