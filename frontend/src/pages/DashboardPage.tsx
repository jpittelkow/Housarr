import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboard, locations } from '@/services/api'
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
  Circle,
  HelpTooltip,
  MapPin,
  getIconByName,
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

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.get(),
  })

  const { data: roomsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  })

  const itemsCount = dashboardData?.items_count ?? 0
  const upcomingReminders = dashboardData?.upcoming_reminders ?? []
  const overdueReminders = dashboardData?.overdue_reminders ?? []
  const incompleteTodos = dashboardData?.incomplete_todos ?? []
  const incompleteTodosCount = dashboardData?.incomplete_todos_count ?? 0
  const allRooms = roomsData?.locations || []

  return (
    <div className="space-y-8">
      {/* Page Header - Untitled UI style */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{greeting()}</p>
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">
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
              <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center">
                <Icon icon={Package} size="sm" className="text-gray-700 dark:text-gray-300" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900 dark:text-gray-50">{itemsCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                Total items
                <HelpTooltip position="bottom">
                  The total number of items you're tracking in your household inventory.
                </HelpTooltip>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center">
                <Icon icon={Bell} size="sm" className="text-gray-700 dark:text-gray-300" />
              </div>
              {upcomingReminders.length > 0 && (
                <Badge variant="warning" size="sm" dot>
                  Due soon
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900 dark:text-gray-50">{upcomingReminders.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                Upcoming reminders
                <HelpTooltip position="bottom">
                  Maintenance reminders due within the next 30 days.
                </HelpTooltip>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center">
                <Icon icon={AlertTriangle} size="sm" className="text-gray-700 dark:text-gray-300" />
              </div>
              {overdueReminders.length > 0 && (
                <Badge variant="error" size="sm" dot>
                  Action needed
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900 dark:text-gray-50">{overdueReminders.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                Overdue
                <HelpTooltip position="bottom">
                  Reminders that have passed their due date and need attention.
                </HelpTooltip>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Open Todos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center">
                <Icon icon={CheckSquare} size="sm" className="text-gray-700 dark:text-gray-300" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-display-xs font-semibold text-gray-900 dark:text-gray-50">{incompleteTodosCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                Open todos
                <HelpTooltip position="bottom">
                  Tasks that haven't been completed yet.
                </HelpTooltip>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Reminders Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
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
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : upcomingReminders.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Icon icon={Bell} size="md" className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">No upcoming reminders</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {upcomingReminders.slice(0, 5).map((reminder) => {
                  const isOverdue = new Date(reminder.due_date) < new Date()
                  return (
                    <li
                      key={reminder.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isOverdue ? 'bg-error-100 dark:bg-error-900/30' : 'bg-warning-100 dark:bg-warning-900/30'
                      }`}>
                        <Icon
                          icon={Calendar}
                          size="sm"
                          className={isOverdue ? 'text-error-600 dark:text-error-400' : 'text-warning-600 dark:text-warning-400'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                          {reminder.title}
                        </p>
                        {reminder.item && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
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
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : incompleteTodos.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Icon icon={CheckSquare} size="md" className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">No open todos</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create a todo to get started</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {incompleteTodos.slice(0, 5).map((todo) => {
                  const priorityStyles = {
                    high: { bg: 'bg-error-100 dark:bg-error-900/30', icon: 'text-error-600 dark:text-error-400', badge: 'error' as const },
                    medium: { bg: 'bg-warning-100 dark:bg-warning-900/30', icon: 'text-warning-600 dark:text-warning-400', badge: 'warning' as const },
                    low: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', badge: 'gray' as const },
                  }
                  const style = priorityStyles[todo.priority as keyof typeof priorityStyles] || priorityStyles.low

                  return (
                    <li
                      key={todo.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${style.bg}`}>
                        <Icon icon={Circle} size="sm" className={style.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                          {todo.title}
                        </p>
                        {todo.item && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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

      {/* Rooms Section */}
      {allRooms.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <CardTitle>Rooms</CardTitle>
              <Badge variant="gray" size="sm">{allRooms.length}</Badge>
            </div>
            <Link to="/rooms">
              <Button variant="link" size="sm" className="text-sm font-semibold">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
              {allRooms.slice(0, 6).map((room) => {
                const RoomIcon = room.icon ? getIconByName(room.icon) : null
                return (
                  <Link
                    key={room.id}
                    to={`/rooms/${room.id}`}
                    className="group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {room.featured_image ? (
                        <img
                          src={room.featured_image.url}
                          alt={room.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Icon icon={RoomIcon || MapPin} size="md" className="text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate max-w-[80px]">
                        {room.name}
                      </p>
                      {room.items_count !== undefined && room.items_count > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {room.items_count} {room.items_count === 1 ? 'item' : 'items'}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
