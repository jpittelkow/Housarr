import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { reports } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Icon, ArrowLeft, Edit, RefreshCw, Loader2, AlertCircle, FileText } from '@/components/ui'
import { toast } from 'sonner'
import type { ChatMessage } from '@/services/api'

export default function ReportViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])

  const isEditMode = searchParams.get('edit') === 'true'
  const isRegenerateMode = searchParams.get('regenerate') === 'true'

  // Fetch report metadata
  const { data: reportData } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reports.get(Number(id)),
    enabled: !!id,
  })

  const report = reportData?.report

  // Fetch report HTML content
  useEffect(() => {
    if (!id) return

    const fetchReport = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const html = await reports.view(Number(id))
        setHtmlContent(html)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load report')
        toast.error('Failed to load report')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [id])

  // Set up edit mode
  useEffect(() => {
    if (isEditMode && report) {
      setReportName(report.name)
      setReportDescription(report.description || '')
      setShowEditModal(true)
    }
  }, [isEditMode, report])

  // Set up regenerate mode
  useEffect(() => {
    if (isRegenerateMode && report) {
      // Load conversation history from report if available
      // For now, we'll start with an empty conversation
      setConversationHistory([])
      setShowRegenerateModal(true)
    }
  }, [isRegenerateMode, report])

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      reports.update(Number(id!), data),
    onSuccess: () => {
      toast.success('Report updated successfully')
      setShowEditModal(false)
      // Refresh report data
      window.location.reload()
    },
    onError: () => {
      toast.error('Failed to update report')
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: () => reports.regenerate(Number(id!), conversationHistory),
    onSuccess: () => {
      toast.success('Report regenerated successfully')
      setShowRegenerateModal(false)
      // Reload the report
      window.location.reload()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to regenerate report')
    },
  })

  const handleUpdate = () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name')
      return
    }
    updateMutation.mutate({
      name: reportName,
      description: reportDescription || undefined,
    })
  }


  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="page-header">
          <Button variant="tertiary" onClick={() => navigate('/reports')} className="mb-4">
            <Icon icon={ArrowLeft} size="sm" className="mr-2" />
            Back to Reports
          </Button>
          <h1 className="page-title">Loading Report...</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Icon icon={Loader2} size="xl" className="text-primary-600 dark:text-primary-400 mx-auto mb-4 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading report content...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="space-y-8">
        <div className="page-header">
          <Button variant="tertiary" onClick={() => navigate('/reports')} className="mb-4">
            <Icon icon={ArrowLeft} size="sm" className="mr-2" />
            Back to Reports
          </Button>
          <h1 className="page-title">Report Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Icon icon={AlertCircle} size="xl" className="text-error-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
              {error || 'Report not found'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The report you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button variant="primary" onClick={() => navigate('/reports')}>
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="tertiary" onClick={() => navigate('/reports')} className="mb-4">
              <Icon icon={ArrowLeft} size="sm" className="mr-2" />
              Back to Reports
            </Button>
            <h1 className="page-title">{report.name}</h1>
            {report.description && (
              <p className="page-description">{report.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(true)}
            >
              <Icon icon={Edit} size="sm" className="mr-2" />
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowRegenerateModal(true)}
            >
              <Icon icon={RefreshCw} size="sm" className="mr-2" />
              Regenerate
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {htmlContent ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <iframe
              srcDoc={htmlContent}
              className="w-full h-[calc(100vh-300px)] min-h-[600px] border-0"
              title={report.name}
              sandbox="allow-scripts allow-same-origin"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Icon icon={FileText} size="xl" className="text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No report content available</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Report"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Report Name</label>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>
          <div>
            <label className="label">Description (Optional)</label>
            <Textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={3}
              disabled={updateMutation.isPending}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !reportName.trim()}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regenerate Modal */}
      <Modal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        title="Regenerate Report"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            To regenerate this report, you'll need to provide a new conversation with Claude describing what changes you want.
            This feature will be enhanced in the future to allow editing the conversation history.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRegenerateModal(false)}
              disabled={regenerateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/reports/create`)}
            >
              Create New Report Instead
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
