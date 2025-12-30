import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settings, type AIAgent, type AIAgentName, type AIAgentsResponse } from '@/services/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Icon, ChevronDown, ChevronUp, Star, Trash2, Check, AlertCircle, Zap } from '@/components/ui'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface AIAgentCardProps {
  agent: AIAgent
  hasApiKey: boolean
  onRefresh: () => void
}

// Provider-specific icons and hints
const AGENT_CONFIG: Record<AIAgentName, {
  icon: string
  keyHint: string
  keyPlaceholder: string
  modelPlaceholder: string
  hasBaseUrl: boolean
  baseUrlHint?: string
  baseUrlPlaceholder?: string
}> = {
  claude: {
    icon: 'A',
    keyHint: 'Get your API key from console.anthropic.com',
    keyPlaceholder: 'sk-ant-...',
    modelPlaceholder: 'claude-sonnet-4-20250514',
    hasBaseUrl: false,
  },
  openai: {
    icon: 'O',
    keyHint: 'Get your API key from platform.openai.com',
    keyPlaceholder: 'sk-...',
    modelPlaceholder: 'gpt-4o',
    hasBaseUrl: true,
    baseUrlHint: 'For OpenAI-compatible APIs (Azure, etc.)',
    baseUrlPlaceholder: 'https://api.openai.com/v1',
  },
  gemini: {
    icon: 'G',
    keyHint: 'Get your API key from aistudio.google.com',
    keyPlaceholder: 'AI...',
    modelPlaceholder: 'gemini-1.5-pro',
    hasBaseUrl: true,
    baseUrlHint: 'Leave blank for default Google API',
    baseUrlPlaceholder: 'https://generativelanguage.googleapis.com/v1beta',
  },
  local: {
    icon: 'L',
    keyHint: 'Only needed if your local server requires authentication',
    keyPlaceholder: 'Optional API key',
    modelPlaceholder: 'llama3',
    hasBaseUrl: true,
    baseUrlHint: 'Ollama: http://localhost:11434, LM Studio: http://localhost:1234',
    baseUrlPlaceholder: 'http://localhost:11434',
  },
}

export function AIAgentCard({ agent, hasApiKey, onRefresh }: AIAgentCardProps) {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(agent.model || '')
  const [baseUrl, setBaseUrl] = useState('')

  const config = AGENT_CONFIG[agent.name]

  // Update agent mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof settings.updateAgent>[1]) =>
      settings.updateAgent(agent.name, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['ai-agents'] })
      const previousAgents = queryClient.getQueryData<AIAgentsResponse>(['ai-agents'])
      // Optimistically update the agent in cache (preserve full structure)
      queryClient.setQueryData<AIAgentsResponse>(['ai-agents'], (old) => {
        if (!old) return old
        return {
          ...old,
          agents: old.agents.map((a) =>
            a.name === agent.name ? { ...a, ...data, enabled: data.enabled ?? a.enabled } : a
          ),
        }
      })
      return { previousAgents }
    },
    onSuccess: () => {
      onRefresh()
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }, _vars, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(['ai-agents'], context.previousAgents)
      }
      const message = error.response?.data?.message || error.message || 'Failed to update agent'
      toast.error(message)
    },
  })

  // Test agent mutation
  const testMutation = useMutation({
    mutationFn: () => settings.testAgent(agent.name),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Connection successful! (${data.response_time_ms}ms)`)
        // Optimistically update test status (preserve full structure)
        queryClient.setQueryData<AIAgentsResponse>(['ai-agents'], (old) => {
          if (!old) return old
          return {
            ...old,
            agents: old.agents.map((a) =>
              a.name === agent.name
                ? {
                    ...a,
                    last_test: {
                      success: true,
                      tested_at: new Date().toISOString(),
                      response_time_ms: data.response_time_ms,
                      error: null,
                    },
                    configured: true,
                  }
                : a
            ),
          }
        })
      } else {
        toast.error(data.message)
      }
      onRefresh()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Test failed')
    },
  })

  // Set as primary mutation with optimistic update
  const setPrimaryMutation = useMutation({
    mutationFn: () => settings.setPrimaryAgent(agent.name),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['ai-agents'] })
      const previousAgents = queryClient.getQueryData<AIAgentsResponse>(['ai-agents'])
      // Optimistically set as primary (preserve full structure)
      queryClient.setQueryData<AIAgentsResponse>(['ai-agents'], (old) => {
        if (!old) return old
        return {
          ...old,
          primary_agent: agent.name,
          agents: old.agents.map((a) => ({
            ...a,
            is_primary: a.name === agent.name,
          })),
        }
      })
      return { previousAgents }
    },
    onSuccess: () => {
      toast.success(`${agent.display_name} is now the primary agent`)
      onRefresh()
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(['ai-agents'], context.previousAgents)
      }
      toast.error('Failed to set primary agent')
    },
  })

  // Toggle enabled
  const handleToggleEnabled = (checked: boolean) => {
    updateMutation.mutate(
      { enabled: checked },
      {
        onSuccess: () => {
          toast.success(checked ? `${agent.display_name} enabled` : `${agent.display_name} disabled`)
        },
      }
    )
  }

  // Save API key
  const handleSaveApiKey = () => {
    if (apiKey) {
      updateMutation.mutate(
        { api_key: apiKey },
        {
          onSuccess: () => {
            setApiKey('')
            setIsEditingKey(false)
            toast.success('API key saved')
          },
        }
      )
    }
  }

  // Delete API key
  const handleDeleteApiKey = () => {
    if (confirm('Delete this API key?')) {
      updateMutation.mutate(
        { api_key: '__DELETE__' },
        {
          onSuccess: () => {
            toast.success('API key deleted')
          },
        }
      )
    }
  }

  // Save model
  const handleSaveModel = () => {
    updateMutation.mutate(
      { model: model || null },
      {
        onSuccess: () => {
          toast.success('Model updated')
        },
      }
    )
  }

  // Save base URL
  const handleSaveBaseUrl = () => {
    updateMutation.mutate(
      { base_url: baseUrl || null },
      {
        onSuccess: () => {
          toast.success('Base URL updated')
        },
      }
    )
  }

  // Format time ago
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return null
    }
  }

  // Get status badge
  const getStatusBadge = () => {
    if (!agent.configured) {
      return <Badge variant="warning" size="sm" dot>Needs Setup</Badge>
    }
    if (!agent.last_test) {
      return <Badge variant="gray" size="sm" dot>Not Tested</Badge>
    }
    if (agent.last_test.success) {
      return <Badge variant="success" size="sm" dot>Connected</Badge>
    }
    return <Badge variant="error" size="sm" dot>Error</Badge>
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Agent Icon */}
          <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{config.icon}</span>
          </div>

          {/* Agent Name and Status */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">{agent.display_name}</span>
              {agent.is_primary && (
                <Badge variant="primary" size="sm">
                  <Icon icon={Star} size="xs" className="mr-0.5" />
                  Primary
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge()}
              {agent.configured && <Badge variant="primary" size="sm" dot>Configured</Badge>}
            </div>
          </div>
        </div>

        {/* Primary Star, Toggle and Expand */}
        <div className="flex items-center gap-2">
          {/* Set as Primary button - clickable star */}
          <button
            onClick={() => {
              if (!agent.is_primary && agent.configured) {
                setPrimaryMutation.mutate()
              }
            }}
            disabled={agent.is_primary || !agent.configured || setPrimaryMutation.isPending}
            className={`p-1.5 rounded transition-colors ${
              agent.is_primary
                ? 'text-primary-500 cursor-default'
                : agent.configured
                  ? 'text-gray-300 hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                  : 'text-gray-200 cursor-not-allowed'
            }`}
            title={agent.is_primary ? 'Primary agent' : agent.configured ? 'Set as primary' : 'Configure to set as primary'}
          >
            <Icon icon={Star} size="sm" className={agent.is_primary ? 'fill-current' : ''} />
          </button>
          <Toggle
            checked={agent.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            size="sm"
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Status Info (always visible) */}
      <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {agent.last_success_at && (
          <span className="flex items-center gap-1">
            <Icon icon={Check} size="xs" className="text-success-500" />
            Last used {formatTimeAgo(agent.last_success_at)}
          </span>
        )}
        {agent.last_test && (
          <span className="flex items-center gap-1">
            <Icon icon={agent.last_test.success ? Check : AlertCircle} size="xs" className={agent.last_test.success ? 'text-success-500' : 'text-error-500'} />
            Tested {formatTimeAgo(agent.last_test.tested_at)}
            {agent.last_test.error && !agent.last_test.success && (
              <span className="text-error-500 ml-1 truncate max-w-[200px]" title={agent.last_test.error}>
                - {agent.last_test.error}
              </span>
            )}
          </span>
        )}
        {agent.model && (
          <span className="flex items-center gap-1">
            <Icon icon={Zap} size="xs" />
            {agent.model}
          </span>
        )}
      </div>

      {/* Expanded Configuration */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              API Key
            </label>
            {hasApiKey && !isEditingKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400">
                  API key saved ••••••••
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingKey(true)}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteApiKey}
                >
                  <Icon icon={Trash2} size="xs" className="text-error-500" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={isEditingKey ? 'Enter new API key' : config.keyPlaceholder}
                  hint={config.keyHint}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveApiKey}
                    disabled={!apiKey}
                  >
                    Save Key
                  </Button>
                  {isEditingKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingKey(false)
                        setApiKey('')
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Model */}
          <div>
            <Input
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={agent.default_model || config.modelPlaceholder}
              hint={`Leave blank for default (${agent.default_model || config.modelPlaceholder})`}
            />
            {model !== (agent.model || '') && (
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={handleSaveModel}
              >
                Save Model
              </Button>
            )}
          </div>

          {/* Base URL (for providers that support it) */}
          {config.hasBaseUrl && (
            <div>
              <Input
                label={agent.name === 'local' ? 'Base URL' : 'Base URL (Optional)'}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={config.baseUrlPlaceholder}
                hint={config.baseUrlHint}
              />
              {baseUrl && (
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  onClick={handleSaveBaseUrl}
                >
                  Save Base URL
                </Button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => testMutation.mutate()}
              isLoading={testMutation.isPending}
              disabled={!agent.configured}
            >
              Test Connection
            </Button>
            {!agent.is_primary && agent.configured && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPrimaryMutation.mutate()}
                isLoading={setPrimaryMutation.isPending}
              >
                <Icon icon={Star} size="xs" className="mr-1" />
                Set as Primary
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
