import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reports, chat, type ChatMessage } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { ChatWindow } from '@/components/Chat/ChatWindow'
import { Icon, ArrowLeft, Sparkles, FileText, CheckCircle, AlertCircle } from '@/components/ui'
import { toast } from 'sonner'

export default function ReportCreatorPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Check if chat is available
  const { data: availabilityData } = useQuery({
    queryKey: ['chat-availability'],
    queryFn: () => chat.checkAvailability(),
    staleTime: 60 * 1000,
  })

  const createReportMutation = useMutation({
    mutationFn: () => reports.create(messages, reportName, reportDescription),
    onSuccess: (data) => {
      toast.success('Report created successfully!')
      navigate(`/reports/${data.report.id}`)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create report')
      setIsGenerating(false)
    },
  })

  const handleSendMessage = async (message: string) => {
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: message }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await chat.send(message, messages)
      
      if (response.success && response.response) {
        setMessages([...newMessages, { role: 'assistant', content: response.response }])
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: response.error || 'Sorry, I encountered an error. Please try again.' }
        ])
        toast.error(response.error || 'Failed to get response from AI')
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ])
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = () => {
    if (messages.length === 0) {
      toast.error('Please have a conversation with Claude first to describe what report you want')
      return
    }

    // Check if we have at least one user message
    const hasUserMessage = messages.some(m => m.role === 'user')
    if (!hasUserMessage) {
      toast.error('Please describe what report you want to create')
      return
    }

    setShowSaveModal(true)
  }

  const handleSave = () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name')
      return
    }

    setIsGenerating(true)
    createReportMutation.mutate()
  }

  const suggestedQuestions = [
    "Create a report showing all my items with their warranty expiration dates",
    "Show me a maintenance schedule report for the next 3 months",
    "Generate a report of all overdue reminders",
    "Create a report listing all items by location",
    "Show me a report of maintenance costs by vendor",
  ]

  if (!availabilityData?.available) {
    return (
      <div className="space-y-8">
        <div className="page-header">
          <Button variant="tertiary" onClick={() => navigate('/reports')} className="mb-4">
            <Icon icon={ArrowLeft} size="sm" className="mr-2" />
            Back to Reports
          </Button>
          <h1 className="page-title">Create Report</h1>
          <p className="page-description">
            AI-powered report creator
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Icon icon={AlertCircle} size="xl" className="text-warning-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
              AI Not Configured
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please configure an AI provider in Settings to create reports.
            </p>
            <Button variant="primary" onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <Button variant="tertiary" onClick={() => navigate('/reports')} className="mb-4">
          <Icon icon={ArrowLeft} size="sm" className="mr-2" />
          Back to Reports
        </Button>
        <h1 className="page-title">Create Report</h1>
        <p className="page-description">
          Chat with Claude to describe the report you want to create. The AI will generate a custom report with your data.
        </p>
      </div>

      {/* Available Data Types Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon icon={FileText} size="sm" className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">
                Available Data
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reports can include: Items, Reminders, Todos, Maintenance Logs, Vendors, Locations, and Dashboard summaries.
                Ask Claude to create a report using any combination of this data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardContent className="p-0">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            suggestedQuestions={suggestedQuestions}
            placeholder="Describe the report you want to create..."
            title="Report Creator"
            subtitle="Chat with Claude to design your report"
            showHeader={true}
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>

      {/* Generate Button */}
      {messages.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            <Icon icon={Sparkles} size="sm" className="mr-2" />
            {isGenerating ? 'Generating Report...' : 'Generate Report'}
          </Button>
        </div>
      )}

      {/* Save Modal */}
      <Modal
        open={showSaveModal}
        onClose={() => {
          if (!isGenerating) {
            setShowSaveModal(false)
          }
        }}
        title="Save Report"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Report Name</label>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g., Maintenance Schedule Report"
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="label">Description (Optional)</label>
            <Textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Brief description of what this report shows..."
              rows={3}
              disabled={isGenerating}
            />
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
              <Icon icon={Sparkles} size="sm" className="animate-spin" />
              <span>Generating your report with Claude. This may take a minute...</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSaveModal(false)
                setIsGenerating(false)
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isGenerating || !reportName.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate & Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
