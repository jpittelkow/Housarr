import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reminders, items } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { formatDate } from '@/lib/utils'
import { Icon, Plus, Bell, Check, Clock, Calendar, Pencil, Trash2, HelpTooltip } from '@/components/ui'
import { toast } from 'sonner'
import type { Reminder } from '@/types'

function ReminderSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="animate-pulse flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40" />
              <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-64" />
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded w-20" />
            <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RemindersPage() {
  const [filter, setFilter] = useState('pending')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Reminder>>({})
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const queryClient = useQueryClient()

  const { data: remindersData, isLoading } = useQuery({
    queryKey: ['reminders', filter],
    queryFn: () => reminders.list(filter === 'pending' ? { status: 'pending' } : {}),
  })

  // Use minimal endpoint for dropdown - only fetches id and name
  const { data: itemsData } = useQuery({
    queryKey: ['items-minimal'],
    queryFn: () => items.listMinimal(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Reminder>) => reminders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsModalOpen(false)
      setFormData({})
      toast.success('Reminder created successfully')
    },
    onError: () => {
      toast.error('Failed to create reminder')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => reminders.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Reminder completed')
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) => reminders.snooze(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Reminder snoozed')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Reminder> }) => reminders.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingReminder(null)
      toast.success('Reminder updated')
    },
    onError: () => {
      toast.error('Failed to update reminder')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reminders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Reminder deleted')
    },
    onError: () => {
      toast.error('Failed to delete reminder')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const allReminders = remindersData?.reminders || []
  const allItems = itemsData?.items || []

  const renderRemindersList = (remindersList: typeof allReminders) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <ReminderSkeleton key={i} />
          ))}
        </div>
      )
    }

    if (remindersList.length === 0) {
      return (
        <EmptyState
          icon={<Icon icon={Bell} size="xl" />}
          title="No reminders"
          description="Create reminders for maintenance tasks to stay on top of things."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Icon icon={Plus} size="xs" /> Add Reminder
            </Button>
          }
        />
      )
    }

    return (
      <div className="space-y-3">
        {remindersList.map((reminder) => {
          const isOverdue = new Date(reminder.due_date) < new Date() && reminder.status === 'pending'

          return (
            <Card key={reminder.id} className={isOverdue ? 'border-error-300 dark:border-error-800' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      reminder.status === 'completed'
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : isOverdue
                        ? 'bg-error-100 dark:bg-error-900/30'
                        : 'bg-warning-100 dark:bg-warning-900/30'
                    }`}>
                      <Icon
                        icon={Calendar}
                        size="sm"
                        className={
                          reminder.status === 'completed'
                            ? 'text-success-600 dark:text-success-400'
                            : isOverdue
                            ? 'text-error-600 dark:text-error-400'
                            : 'text-warning-600 dark:text-warning-400'
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-gray-50">{reminder.title}</h3>
                        <Badge
                          variant={
                            reminder.status === 'completed'
                              ? 'success'
                              : isOverdue
                              ? 'error'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {isOverdue ? 'Overdue' : reminder.status}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatDate(reminder.due_date)}</span>
                        {reminder.item && <span>• {reminder.item.name}</span>}
                        {reminder.repeat_interval && (
                          <span>• Repeats every {reminder.repeat_interval} days</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingReminder(reminder)}
                    >
                      <Icon icon={Pencil} size="xs" />
                    </Button>
                    {reminder.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => snoozeMutation.mutate({ id: reminder.id, days: 1 })}
                        >
                          <Icon icon={Clock} size="xs" /> Snooze
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => completeMutation.mutate(reminder.id)}
                        >
                          <Icon icon={Check} size="xs" /> Complete
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this reminder?')) {
                          deleteMutation.mutate(reminder.id)
                        }
                      }}
                    >
                      <Icon icon={Trash2} size="xs" className="text-gray-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Untitled UI style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            Reminders
            <HelpTooltip position="right">
              Set up recurring or one-time reminders for maintenance tasks. Link them to items and get notified when they're due.
            </HelpTooltip>
          </h1>
          <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">Keep track of maintenance schedules</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Icon icon={Plus} size="xs" /> Add Reminder
        </Button>
      </div>

      {/* Tabs Filter - Untitled UI style */}
      <Tabs defaultValue="pending" onChange={setFilter}>
        <TabList>
          <Tab value="pending">Pending</Tab>
          <Tab value="all">All</Tab>
        </TabList>
        <TabPanel value="pending">
          {renderRemindersList(allReminders)}
        </TabPanel>
        <TabPanel value="all">
          {renderRemindersList(allReminders)}
        </TabPanel>
      </Tabs>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Reminder"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Change AC filter"
            required
          />

          <Input
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details..."
          />

          <Select
            label="Related Item"
            options={[
              { value: '', label: 'None' },
              ...allItems.map((i) => ({ value: i.id, label: i.name })),
            ]}
            value={formData.item_id || ''}
            onChange={(e) => setFormData({ ...formData, item_id: Number(e.target.value) || undefined })}
          />

          <Input
            label="Due Date"
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            required
          />

          <Input
            label="Repeat Every (days)"
            type="number"
            min="1"
            value={formData.repeat_interval || ''}
            onChange={(e) => setFormData({ ...formData, repeat_interval: Number(e.target.value) || undefined })}
            placeholder="e.g., 90 for quarterly"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Reminder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingReminder}
        onClose={() => setEditingReminder(null)}
        title="Edit Reminder"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingReminder) {
              updateMutation.mutate({
                id: editingReminder.id,
                data: {
                  title: editingReminder.title,
                  description: editingReminder.description,
                  due_date: editingReminder.due_date,
                  repeat_interval: editingReminder.repeat_interval,
                  item_id: editingReminder.item_id,
                },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Title"
            value={editingReminder?.title || ''}
            onChange={(e) => setEditingReminder(prev => prev ? { ...prev, title: e.target.value } : null)}
            required
          />

          <Input
            label="Description"
            value={editingReminder?.description || ''}
            onChange={(e) => setEditingReminder(prev => prev ? { ...prev, description: e.target.value } : null)}
          />

          <Select
            label="Related Item"
            options={[
              { value: '', label: 'None' },
              ...allItems.map((i) => ({ value: i.id, label: i.name })),
            ]}
            value={editingReminder?.item_id || ''}
            onChange={(e) => setEditingReminder(prev => prev ? { ...prev, item_id: Number(e.target.value) || null } : null)}
          />

          <Input
            label="Due Date"
            type="date"
            value={editingReminder?.due_date || ''}
            onChange={(e) => setEditingReminder(prev => prev ? { ...prev, due_date: e.target.value } : null)}
            required
          />

          <Input
            label="Repeat Every (days)"
            type="number"
            min="1"
            value={editingReminder?.repeat_interval || ''}
            onChange={(e) => setEditingReminder(prev => prev ? { ...prev, repeat_interval: Number(e.target.value) || null } : null)}
            placeholder="e.g., 90 for quarterly"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setEditingReminder(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
