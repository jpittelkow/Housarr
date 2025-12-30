import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chat, type ChatMessage } from '@/services/api'

interface ItemChatState {
  messages: ChatMessage[]
  isLoading: boolean
  contextInfo: {
    manualsIncluded?: number
    serviceHistoryIncluded?: number
    partsIncluded?: number
  }
}

interface ChatStore {
  // Per-item chat state
  itemChats: Record<number, ItemChatState>
  
  // Actions
  getItemChat: (itemId: number) => ItemChatState
  sendMessage: (itemId: number, message: string) => Promise<void>
  clearHistory: (itemId: number) => void
}

const defaultItemChat: ItemChatState = {
  messages: [],
  isLoading: false,
  contextInfo: {},
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      itemChats: {},

      getItemChat: (itemId: number) => {
        return get().itemChats[itemId] || defaultItemChat
      },

      sendMessage: async (itemId: number, message: string) => {
        const currentChat = get().itemChats[itemId] || defaultItemChat
        const currentMessages = currentChat.messages

        // Add user message and set loading
        const userMessage: ChatMessage = { role: 'user', content: message }
        set((state) => ({
          itemChats: {
            ...state.itemChats,
            [itemId]: {
              ...currentChat,
              messages: [...currentMessages, userMessage],
              isLoading: true,
            },
          },
        }))

        try {
          // Send to API - this continues even if component unmounts
          const response = await chat.sendWithItem(itemId, message, currentMessages)

          // Get the latest state (in case user sent more messages while waiting)
          const latestChat = get().itemChats[itemId]
          const latestMessages = latestChat?.messages || [...currentMessages, userMessage]

          if (response.success && response.response) {
            const assistantMessage: ChatMessage = { role: 'assistant', content: response.response }
            
            set((state) => ({
              itemChats: {
                ...state.itemChats,
                [itemId]: {
                  messages: [...latestMessages, assistantMessage],
                  isLoading: false,
                  contextInfo: response.context ? {
                    manualsIncluded: response.context.manuals_included,
                    serviceHistoryIncluded: response.context.service_history_included,
                    partsIncluded: response.context.parts_included,
                  } : latestChat?.contextInfo || {},
                },
              },
            }))
          } else {
            const errorMessage: ChatMessage = { 
              role: 'assistant', 
              content: response.error || 'Sorry, I encountered an error. Please try again.' 
            }
            
            set((state) => ({
              itemChats: {
                ...state.itemChats,
                [itemId]: {
                  ...latestChat,
                  messages: [...latestMessages, errorMessage],
                  isLoading: false,
                },
              },
            }))
          }
        } catch (error) {
          // Handle error - add error message
          const latestChat = get().itemChats[itemId]
          const latestMessages = latestChat?.messages || [...currentMessages, userMessage]
          
          const errorMessage: ChatMessage = { 
            role: 'assistant', 
            content: 'Sorry, I encountered an error. Please try again.' 
          }
          
          set((state) => ({
            itemChats: {
              ...state.itemChats,
              [itemId]: {
                ...latestChat,
                messages: [...latestMessages, errorMessage],
                isLoading: false,
              },
            },
          }))
        }
      },

      clearHistory: (itemId: number) => {
        set((state) => ({
          itemChats: {
            ...state.itemChats,
            [itemId]: defaultItemChat,
          },
        }))
      },
    }),
    {
      name: 'housarr-item-chats',
      // Only persist messages and contextInfo, not loading state
      partialize: (state) => ({
        itemChats: Object.fromEntries(
          Object.entries(state.itemChats).map(([key, value]) => [
            key,
            { messages: value.messages, contextInfo: value.contextInfo, isLoading: false },
          ])
        ),
      }),
    }
  )
)
