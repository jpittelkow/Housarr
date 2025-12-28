import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { todos, items } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Icon, Plus, CheckSquare, Circle, CheckCircle, Pencil, Trash2, HelpTooltip } from '@/components/ui'
import toast from 'react-hot-toast'
import type { Todo } from '@/types'

function TodoSkeleton() {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-14" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TodosPage() {
  const [filter, setFilter] = useState('incomplete')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Todo>>({ priority: 'medium' })
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const queryClient = useQueryClient()

  const { data: todosData, isLoading } = useQuery({
    queryKey: ['todos', filter],
    queryFn: () =>
      todos.list(
        filter === 'incomplete'
          ? { incomplete: true }
          : filter === 'completed'
          ? { completed: true }
          : {}
      ),
  })

  // Use minimal endpoint for dropdown - only fetches id and name
  const { data: itemsData } = useQuery({
    queryKey: ['items-minimal'],
    queryFn: () => items.listMinimal(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Todo>) => todos.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setIsModalOpen(false)
      setFormData({ priority: 'medium' })
      toast.success('Todo created successfully')
    },
    onError: () => {
      toast.error('Failed to create todo')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => todos.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Todo> }) => todos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setEditingTodo(null)
      toast.success('Todo updated')
    },
    onError: () => {
      toast.error('Failed to update todo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => todos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      toast.success('Todo deleted')
    },
    onError: () => {
      toast.error('Failed to delete todo')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const allTodos = todosData?.todos || []
  const allItems = itemsData?.items || []

  const renderTodosList = (todosList: typeof allTodos) => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <TodoSkeleton key={i} />
          ))}
        </div>
      )
    }

    if (todosList.length === 0) {
      return (
        <EmptyState
          icon={<Icon icon={CheckSquare} size="xl" />}
          title="No todos"
          description="Create tasks to keep track of things to do around the house."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Icon icon={Plus} size="xs" /> Add Todo
            </Button>
          }
        />
      )
    }

    return (
      <div className="space-y-2">
        {todosList.map((todo) => (
          <Card key={todo.id} hover>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => completeMutation.mutate(todo.id)}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    todo.completed_at ? 'text-success-500' : 'text-gray-300 hover:text-gray-400'
                  )}
                >
                  {todo.completed_at ? (
                    <Icon icon={CheckCircle} size="md" />
                  ) : (
                    <Icon icon={Circle} size="md" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'font-medium',
                        todo.completed_at ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-50'
                      )}
                    >
                      {todo.title}
                    </span>
                    <Badge
                      variant={
                        todo.priority === 'high'
                          ? 'error'
                          : todo.priority === 'medium'
                          ? 'warning'
                          : 'gray'
                      }
                      size="sm"
                    >
                      {todo.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {todo.item && <span>{todo.item.name}</span>}
                    {todo.due_date && <span>Due {formatDate(todo.due_date)}</span>}
                    {todo.user && <span>Assigned to {todo.user.name}</span>}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTodo(todo)
                    }}
                  >
                    <Icon icon={Pencil} size="xs" className="text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this todo?')) {
                        deleteMutation.mutate(todo.id)
                      }
                    }}
                  >
                    <Icon icon={Trash2} size="xs" className="text-gray-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Untitled UI style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            Todos
            <HelpTooltip position="right">
              Manage your household task list. Set priorities, link to items, and track completion.
            </HelpTooltip>
          </h1>
          <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">Your household task list</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Icon icon={Plus} size="xs" /> Add Todo
        </Button>
      </div>

      {/* Tabs Filter - Untitled UI style */}
      <Tabs defaultValue="incomplete" onChange={setFilter}>
        <TabList>
          <Tab value="incomplete">Open</Tab>
          <Tab value="completed">Completed</Tab>
          <Tab value="all">All</Tab>
        </TabList>
        <TabPanel value="incomplete">
          {renderTodosList(allTodos)}
        </TabPanel>
        <TabPanel value="completed">
          {renderTodosList(allTodos)}
        </TabPanel>
        <TabPanel value="all">
          {renderTodosList(allTodos)}
        </TabPanel>
      </Tabs>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Todo"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Clean gutters"
            required
          />

          <Input
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details..."
          />

          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            value={formData.priority || 'medium'}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Todo['priority'] })}
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
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Todo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTodo}
        onClose={() => setEditingTodo(null)}
        title="Edit Todo"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingTodo) {
              updateMutation.mutate({
                id: editingTodo.id,
                data: {
                  title: editingTodo.title,
                  description: editingTodo.description,
                  priority: editingTodo.priority,
                  due_date: editingTodo.due_date,
                  item_id: editingTodo.item_id,
                },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Title"
            value={editingTodo?.title || ''}
            onChange={(e) => setEditingTodo(prev => prev ? { ...prev, title: e.target.value } : null)}
            required
          />

          <Input
            label="Description"
            value={editingTodo?.description || ''}
            onChange={(e) => setEditingTodo(prev => prev ? { ...prev, description: e.target.value } : null)}
          />

          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            value={editingTodo?.priority || 'medium'}
            onChange={(e) => setEditingTodo(prev => prev ? { ...prev, priority: e.target.value as Todo['priority'] } : null)}
          />

          <Select
            label="Related Item"
            options={[
              { value: '', label: 'None' },
              ...allItems.map((i) => ({ value: i.id, label: i.name })),
            ]}
            value={editingTodo?.item_id || ''}
            onChange={(e) => setEditingTodo(prev => prev ? { ...prev, item_id: Number(e.target.value) || null } : null)}
          />

          <Input
            label="Due Date"
            type="date"
            value={editingTodo?.due_date || ''}
            onChange={(e) => setEditingTodo(prev => prev ? { ...prev, due_date: e.target.value } : null)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setEditingTodo(null)}>
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
