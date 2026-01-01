import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { reports } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { Icon, Plus, FileText, Trash2, Edit, Eye, RefreshCw } from '@/components/ui'
import { toast } from 'sonner'
import type { Report } from '@/types'

function ReportCard({ report }: { report: Report }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => reports.delete(report.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report deleted successfully')
      setShowDeleteModal(false)
    },
    onError: () => {
      toast.error('Failed to delete report')
    },
  })

  return (
    <>
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <Icon icon={FileText} size="md" className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1 truncate">
                  {report.name}
                </h3>
                {report.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                    {report.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Created {formatDate(report.created_at)}</span>
                  {report.created_by && (
                    <span>by {report.created_by.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => navigate(`/reports/${report.id}?edit=true`)}
                title="Edit"
              >
                <Icon icon={Edit} size="sm" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                title="Delete"
              >
                <Icon icon={Trash2} size="sm" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/reports/${report.id}`)}
              className="flex-1"
            >
              <Icon icon={Eye} size="sm" className="mr-2" />
              View Report
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/reports/${report.id}?regenerate=true`)}
            >
              <Icon icon={RefreshCw} size="sm" className="mr-2" />
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Report"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{report.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default function ReportsPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reports.list(),
  })

  const reportsList = data?.reports || []

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="page-header">
          <h1 className="page-title">Reports</h1>
          <p className="page-description">
            AI-generated reports with always up-to-date data
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-description">
              AI-generated reports with always up-to-date data
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/reports/create')}
          >
            <Icon icon={Plus} size="sm" className="mr-2" />
            Create New Report
          </Button>
        </div>
      </div>

      {/* Reports List */}
      {reportsList.length === 0 ? (
        <EmptyState
          icon={<Icon icon={FileText} size="xl" />}
          title="No reports yet"
          description="Create your first AI-powered report by chatting with Claude about what data you'd like to see."
          action={
            <Button variant="primary" onClick={() => navigate('/reports/create')}>
              <Icon icon={Plus} size="sm" className="mr-2" />
              Create Your First Report
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportsList.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
