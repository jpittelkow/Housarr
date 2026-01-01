import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '../chatStore'

// Mock the api module
vi.mock('@/services/api', () => ({
  chat: {
    sendWithItem: vi.fn().mockResolvedValue({
      success: true,
      response: 'Test response',
    }),
  },
}))

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({ itemChats: {} })
  })

  describe('getItemChat', () => {
    it('returns default state for new item', () => {
      const state = useChatStore.getState()
      const itemChat = state.getItemChat(1)
      
      expect(itemChat.messages).toEqual([])
      expect(itemChat.isLoading).toBe(false)
      expect(itemChat.contextInfo).toEqual({})
    })

    it('returns existing chat for known item', () => {
      useChatStore.setState({
        itemChats: {
          1: {
            messages: [{ role: 'user', content: 'Hello' }],
            isLoading: false,
            contextInfo: {},
          },
        },
      })

      const state = useChatStore.getState()
      const itemChat = state.getItemChat(1)
      
      expect(itemChat.messages).toHaveLength(1)
      expect(itemChat.messages[0].content).toBe('Hello')
    })
  })

  describe('clearHistory', () => {
    it('clears messages for an item', () => {
      useChatStore.setState({
        itemChats: {
          1: {
            messages: [{ role: 'user', content: 'Hello' }],
            isLoading: false,
            contextInfo: {},
          },
        },
      })

      useChatStore.getState().clearHistory(1)

      const state = useChatStore.getState()
      const itemChat = state.getItemChat(1)
      
      expect(itemChat.messages).toEqual([])
    })

    it('does not affect other items', () => {
      useChatStore.setState({
        itemChats: {
          1: {
            messages: [{ role: 'user', content: 'Item 1' }],
            isLoading: false,
            contextInfo: {},
          },
          2: {
            messages: [{ role: 'user', content: 'Item 2' }],
            isLoading: false,
            contextInfo: {},
          },
        },
      })

      useChatStore.getState().clearHistory(1)

      const state = useChatStore.getState()
      expect(state.getItemChat(1).messages).toEqual([])
      expect(state.getItemChat(2).messages).toHaveLength(1)
    })
  })

  describe('state management', () => {
    it('can update state directly via setState', () => {
      useChatStore.setState({
        itemChats: {
          1: {
            messages: [
              { role: 'user', content: 'Question' },
              { role: 'assistant', content: 'Answer' },
            ],
            isLoading: false,
            contextInfo: { manualsIncluded: 2 },
          },
        },
      })

      const state = useChatStore.getState()
      const itemChat = state.getItemChat(1)
      
      expect(itemChat.messages).toHaveLength(2)
      expect(itemChat.contextInfo.manualsIncluded).toBe(2)
    })

    it('handles multiple items independently', () => {
      useChatStore.setState({
        itemChats: {
          1: {
            messages: [{ role: 'user', content: 'Item 1' }],
            isLoading: false,
            contextInfo: {},
          },
          2: {
            messages: [{ role: 'user', content: 'Item 2' }],
            isLoading: true,
            contextInfo: {},
          },
        },
      })

      const state = useChatStore.getState()
      
      expect(state.getItemChat(1).isLoading).toBe(false)
      expect(state.getItemChat(2).isLoading).toBe(true)
    })
  })
})
