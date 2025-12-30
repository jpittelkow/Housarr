import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '../chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      messages: [],
      isOpen: false,
      isLoading: false,
      itemContext: null,
    })
  })

  describe('initial state', () => {
    it('starts with empty messages', () => {
      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
    })

    it('starts closed', () => {
      const state = useChatStore.getState()
      expect(state.isOpen).toBe(false)
    })

    it('starts not loading', () => {
      const state = useChatStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('starts with no item context', () => {
      const state = useChatStore.getState()
      expect(state.itemContext).toBeNull()
    })
  })

  describe('addMessage', () => {
    it('adds a user message', () => {
      useChatStore.getState().addMessage('Hello', 'user')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('Hello')
      expect(state.messages[0].role).toBe('user')
    })

    it('adds an assistant message', () => {
      useChatStore.getState().addMessage('Hi there!', 'assistant')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('Hi there!')
      expect(state.messages[0].role).toBe('assistant')
    })

    it('adds messages in order', () => {
      const store = useChatStore.getState()
      store.addMessage('First', 'user')
      store.addMessage('Second', 'assistant')
      store.addMessage('Third', 'user')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(3)
      expect(state.messages[0].content).toBe('First')
      expect(state.messages[1].content).toBe('Second')
      expect(state.messages[2].content).toBe('Third')
    })

    it('generates unique IDs for each message', () => {
      const store = useChatStore.getState()
      store.addMessage('Message 1', 'user')
      store.addMessage('Message 2', 'user')

      const state = useChatStore.getState()
      expect(state.messages[0].id).not.toBe(state.messages[1].id)
    })

    it('adds timestamp to messages', () => {
      const before = Date.now()
      useChatStore.getState().addMessage('Test', 'user')
      const after = Date.now()

      const state = useChatStore.getState()
      const timestamp = state.messages[0].timestamp
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('clearMessages', () => {
    it('clears all messages', () => {
      const store = useChatStore.getState()
      store.addMessage('Message 1', 'user')
      store.addMessage('Message 2', 'assistant')

      store.clearMessages()

      expect(useChatStore.getState().messages).toEqual([])
    })

    it('can add messages after clearing', () => {
      const store = useChatStore.getState()
      store.addMessage('Old message', 'user')
      store.clearMessages()
      store.addMessage('New message', 'user')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('New message')
    })
  })

  describe('setIsOpen', () => {
    it('opens the chat', () => {
      useChatStore.getState().setIsOpen(true)
      expect(useChatStore.getState().isOpen).toBe(true)
    })

    it('closes the chat', () => {
      useChatStore.setState({ isOpen: true })
      useChatStore.getState().setIsOpen(false)
      expect(useChatStore.getState().isOpen).toBe(false)
    })
  })

  describe('toggleOpen', () => {
    it('toggles from closed to open', () => {
      useChatStore.setState({ isOpen: false })
      useChatStore.getState().toggleOpen()
      expect(useChatStore.getState().isOpen).toBe(true)
    })

    it('toggles from open to closed', () => {
      useChatStore.setState({ isOpen: true })
      useChatStore.getState().toggleOpen()
      expect(useChatStore.getState().isOpen).toBe(false)
    })
  })

  describe('setIsLoading', () => {
    it('sets loading to true', () => {
      useChatStore.getState().setIsLoading(true)
      expect(useChatStore.getState().isLoading).toBe(true)
    })

    it('sets loading to false', () => {
      useChatStore.setState({ isLoading: true })
      useChatStore.getState().setIsLoading(false)
      expect(useChatStore.getState().isLoading).toBe(false)
    })
  })

  describe('setItemContext', () => {
    it('sets item context', () => {
      const mockItem = {
        id: 1,
        name: 'Test Item',
        make: 'TestMake',
        model: 'TestModel',
      }

      useChatStore.getState().setItemContext(mockItem)

      const state = useChatStore.getState()
      expect(state.itemContext).toEqual(mockItem)
    })

    it('clears item context when passed null', () => {
      useChatStore.setState({
        itemContext: { id: 1, name: 'Test' },
      })

      useChatStore.getState().setItemContext(null)

      expect(useChatStore.getState().itemContext).toBeNull()
    })
  })

  describe('state combinations', () => {
    it('maintains all state correctly', () => {
      const store = useChatStore.getState()

      store.addMessage('Hello', 'user')
      store.setIsOpen(true)
      store.setIsLoading(true)
      store.setItemContext({ id: 1, name: 'Item' })

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.isOpen).toBe(true)
      expect(state.isLoading).toBe(true)
      expect(state.itemContext?.name).toBe('Item')
    })

    it('clearMessages does not affect other state', () => {
      const store = useChatStore.getState()
      store.addMessage('Test', 'user')
      store.setIsOpen(true)
      store.setItemContext({ id: 1, name: 'Item' })

      store.clearMessages()

      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.isOpen).toBe(true) // Should remain open
      expect(state.itemContext).not.toBeNull() // Should remain
    })
  })
})
