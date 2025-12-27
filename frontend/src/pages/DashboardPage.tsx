import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reminders, todos, items } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Icon,
  Bell,
  CheckSquare,
  Package,
  AlertTriangle,
  Calendar,
  Circle
} from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders', 'upcoming'],
    queryFn: () => reminders.list({ upcoming: 7, status: 'pending' }),
  })

  const { data: overdueData } = useQuery({
    queryKey: ['reminders', 'overdue'],
    queryFn: () => reminders.list({ overdue: true }),
  })

  const { data: todosData, isLoading: todosLoading } = useQuery({
    queryKey: ['todos', 'incomplete'],
    queryFn: () => todos.list({ incomplete: true }),
  })

  const { data: itemsData } = useQuery({
    queryKey: ['items'],
    queryFn: () => items.list(),
  })

  const upcomingReminders = remindersData?.reminders || []
  const overdueReminders = overdueData?.reminders || []
  const incompleteTodos = todosData?.todos || []
  const allItems = itemsData?.items || []

  return (
    <div className="space-y-8">
      {/* Page Header - Untitled UI style */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary-600">{greeting()}</p>
          <h1 className="text-display-sm font-semibold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-text-md text-gray-500 mt-1">
            Here's what's happening with your home today.
          </p>
        </div>
      </div>

      {/* Metric Cards - Untitled UI pattern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-xs flex items-center justify-center">
                <Icon icon={Package} size="sm" className="text-gray-700" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900">{allItems.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total items</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-xs flex items-center justify-center">
                <Icon icon={Bell} size="sm" className="text-gray-700" />
              </div>
              {upcomingReminders.length > 0 && (
                <Badge variant="warning" size="sm" dot>
                  Due soon
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900">{upcomingReminders.length}</p>
              <p className="text-sm text-gray-500 mt-1">Upcoming reminders</p>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-xs flex items-center justify-center">
                <Icon icon={AlertTriangle} size="sm" className="text-gray-700" />
              </div>
              {overdueReminders.length > 0 && (
                <Badge variant="error" size="sm" dot>
                  Action needed
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900">{overdueReminders.length}</p>
              <p className="text-sm text-gray-500 mt-1">Overdue</p>
            </div>
          </CardContent>
        </Card>

        {/* Open Todos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-xs flex items-center justify-center">
                <Icon icon={CheckSquare} size="sm" className="text-gray-700" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900">{incompleteTodos.length}</p>
              <p className="text-sm text-gray-500 mt-1">Open todos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Reminders Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <CardTitle>Upcoming Reminders</CardTitle>
              {upcomingReminders.length > 0 && (
                <Badge variant="gray" size="sm">{upcomingReminders.length}</Badge>
              )}
            </div>
            <Link to="/reminders">
              <Button variant="link" size="sm" className="text-sm font-semibold">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {remindersLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : upcomingReminders.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Icon icon={Bell} size="md" className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No upcoming reminders</p>
                <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {upcomingReminders.slice(0, 5).map((reminder) => {
                  const isOverdue = new Date(reminder.due_date) < new Date()
                  return (
                    <li
                      key={reminder.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isOverdue ? 'bg-error-100' : 'bg-warning-100'
                      }`}>
                        <Icon
                          icon={Calendar}
                          size="sm"
                          className={isOverdue ? 'text-error-600' : 'text-warning-600'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {reminder.title}
                        </p>
                        {reminder.item && (
                          <p className="text-sm text-gray-500 truncate">
                            {reminder.item.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={isOverdue ? 'error' : 'warning'} size="sm">
                        {formatDate(reminder.due_date)}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Open Todos Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <CardTitle>Open Todos</CardTitle>
              {incompleteTodos.length > 0 && (
                <Badge variant="gray" size="sm">{incompleteTodos.length}</Badge>
              )}
            </div>
            <Link to="/todos">
              <Button variant="link" size="sm" className="text-sm font-semibold">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {todosLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : incompleteTodos.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Icon icon={CheckSquare} size="md" className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No open todos</p>
                <p className="text-sm text-gray-500 mt-1">Create a todo to get started</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {incompleteTodos.slice(0, 5).map((todo) => {
                  const priorityStyles = {
                    high: { bg: 'bg-error-100', icon: 'text-error-600', badge: 'error' as const },
                    medium: { bg: 'bg-warning-100', icon: 'text-warning-600', badge: 'warning' as const },
                    low: { bg: 'bg-gray-100', icon: 'text-gray-600', badge: 'gray' as const },
                  }
                  const style = priorityStyles[todo.priority as keyof typeof priorityStyles] || priorityStyles.low

                  return (
                    <li
                      key={todo.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${style.bg}`}>
                        <Icon icon={Circle} size="sm" className={style.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {todo.title}
                        </p>
                        {todo.item && (
                          <p className="text-sm text-gray-500 truncate">
                            {todo.item.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={style.badge} size="sm">
                        {todo.priority}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
