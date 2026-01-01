import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locations, items, paintColors } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Icon,
  ArrowLeft,
  MapPin,
  Package,
  Calendar,
  Building,
  LayoutGrid,
  List,
  Home,
  getIconByName,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
  IconPicker,
  HelpTooltip,
} from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { PaintColorForm } from '@/components/PaintColorForm'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/utils'
import type { Location, Item, PaintColor } from '@/types'

function ItemCardSkeleton() {
  return (
    <Card>
      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-t-xl" />
      <CardContent className="py-4">
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ItemListSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-32" />
      </div>
      <div className="hidden sm:flex items-center gap-6">
        <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-20" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
      </div>
    </div>
  )
}

// Virtualized list row component - memoized for performance
const VirtualizedItemRow = ({ item }: { item: Item }) => (
  <Link
    to={`/items/${item.id}`}
    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
  >
    {/* Thumbnail */}
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
      {item.featured_image ? (
        <img
          src={item.featured_image.url}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon icon={Package} size="sm" className="text-gray-300 dark:text-gray-600" />
        </div>
      )}
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-gray-900 dark:text-gray-50 truncate">{item.name}</h3>
      {(item.make || item.model) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {[item.make, item.model].filter(Boolean).join(' ')}
        </p>
      )}
    </div>

    {/* Category Badge */}
    {item.category && (
      <Badge
        size="sm"
        className="hidden sm:inline-flex flex-shrink-0"
        style={{
          backgroundColor: `${item.category.color}20`,
          color: item.category.color ?? undefined
        }}
      >
        {item.category.name}
      </Badge>
    )}

    {/* Vendor */}
    {item.vendor && (
      <span
        className="hidden md:flex items-center gap-1 text-sm text-primary-600 flex-shrink-0"
      >
        <Icon icon={Building} size="xs" />
        <span className="truncate max-w-[100px]">{item.vendor.name}</span>
      </span>
    )}

    {/* Install Date */}
    {item.install_date && (
      <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
        <Icon icon={Calendar} size="xs" className="text-gray-400" />
        <span>{formatDate(item.install_date)}</span>
      </div>
    )}
  </Link>
)

// Simple list component
function ItemList({ items: itemsList }: { items: Item[] }) {
  return (
    <Card>
      <div className="max-h-[calc(100vh-300px)] overflow-auto">
        {itemsList.map((item) => (
          <VirtualizedItemRow key={item.id} item={item} />
        ))}
      </div>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-32" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 h-64" />
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 h-48" />
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 aspect-square" />
        </div>
      </div>
    </div>
  )
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const roomId = Number(id!)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState<Partial<Location>>({})
  const [editingPaintColor, setEditingPaintColor] = useState<PaintColor | null>(null)
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [analyzeResults, setAnalyzeResults] = useState<Array<{
    brand: string | null
    color_name: string
    hex_code: string | null
    rgb_r: number | null
    rgb_g: number | null
    rgb_b: number | null
    purchase_url: string | null
    product_url: string | null
    confidence: number
  }> | null>(null)
  const [paintColorFormData, setPaintColorFormData] = useState<Partial<PaintColor>>({
    brand: '',
    color_name: '',
    hex_code: '',
    rgb_r: null,
    rgb_g: null,
    rgb_b: null,
    purchase_url: '',
    product_url: '',
  })

  const { data: roomData, isLoading: isLoadingRoom } = useQuery({
    queryKey: ['locations', roomId],
    queryFn: () => locations.get(roomId),
    enabled: !!roomId,
  })

  const { data: itemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ['items', { location_id: roomId }],
    queryFn: () => items.list({ location_id: roomId }),
    enabled: !!roomId,
  })

  const room = roomData?.location
  const allItems = itemsData?.items || []
  const RoomIcon = room?.icon ? getIconByName(room.icon) : null

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) => locations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', roomId] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setIsEditModalOpen(false)
      toast.success('Room updated successfully')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update room'))
    },
  })

  const deleteRoomMutation = useMutation({
    mutationFn: (id: number) => locations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Room deleted successfully')
      navigate('/rooms')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to delete room'))
    },
  })

  const createPaintColorMutation = useMutation({
    mutationFn: ({ locationId, data }: { locationId: number; data: Partial<PaintColor> }) => paintColors.create(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', roomId] })
      setEditingPaintColor(null)
      setPaintColorFormData({
        brand: '', color_name: '', hex_code: '', rgb_r: null, rgb_g: null, rgb_b: null, purchase_url: '', product_url: '',
      })
      toast.success('Paint color added')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to add paint color'))
    },
  })

  const updatePaintColorMutation = useMutation({
    mutationFn: ({ locationId, id, data }: { locationId: number; id: number; data: Partial<PaintColor> }) => paintColors.update(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', roomId] })
      setEditingPaintColor(null)
      toast.success('Paint color updated')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to update paint color'))
    },
  })

  const deletePaintColorMutation = useMutation({
    mutationFn: ({ locationId, id }: { locationId: number; id: number }) => paintColors.delete(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', roomId] })
      toast.success('Paint color deleted')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete paint color'))
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: ({ locationId, fileId }: { locationId: number; fileId: number }) => paintColors.analyzeWallColor(locationId, fileId),
    onSuccess: (data) => {
      if (data.success && data.paint_colors) {
        setAnalyzeResults(data.paint_colors)
      } else {
        toast.error(data.message || 'Failed to analyze wall color')
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to analyze wall color'))
    },
  })

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (room) {
      updateRoomMutation.mutate({
        id: room.id,
        data: {
          name: editData.name,
          icon: editData.icon,
          notes: editData.notes,
        },
      })
    }
  }


  const handleAnalyze = () => {
    if (!room || !selectedImageId) return
    analyzeMutation.mutate({ locationId: room.id, fileId: selectedImageId })
  }

  const handleSelectAnalyzedColor = (color: typeof analyzeResults extends (infer T)[] | null ? T : never) => {
    if (!room) return
    setPaintColorFormData({
      brand: color.brand || '',
      color_name: color.color_name,
      hex_code: color.hex_code || '',
      rgb_r: color.rgb_r ?? null,
      rgb_g: color.rgb_g ?? null,
      rgb_b: color.rgb_b ?? null,
      purchase_url: color.purchase_url || '',
      product_url: color.product_url || '',
    })
    setAnalyzeResults(null)
    setIsAnalyzeModalOpen(false)
    setSelectedImageId(null)
    setEditingPaintColor(null)
  }

  const getColorSwatchStyle = (color: PaintColor) => {
    if (color.hex_code) {
      return { backgroundColor: color.hex_code }
    }
    if (color.rgb_r !== null && color.rgb_g !== null && color.rgb_b !== null) {
      return { backgroundColor: `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})` }
    }
    return { backgroundColor: '#cccccc' }
  }

  if (isLoadingRoom) {
    return <DetailSkeleton />
  }

  if (!room) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rooms')}>
          <Icon icon={ArrowLeft} size="xs" /> Back to Rooms
        </Button>
        <EmptyState
          icon={<Icon icon={Home} size="xl" />}
          title="Room not found"
          description="The room you're looking for doesn't exist or you don't have access to it."
          action={
            <Button onClick={() => navigate('/rooms')}>
              <Icon icon={ArrowLeft} size="xs" /> Back to Rooms
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/rooms')}>
            <Icon icon={ArrowLeft} size="xs" />
          </Button>
          <div className="flex items-center gap-3">
            {room.featured_image ? (
              <img
                src={room.featured_image.url}
                alt={room.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Icon icon={RoomIcon || MapPin} size="sm" className="text-gray-400 dark:text-gray-500" />
              </div>
            )}
            <div>
              <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">{room.name}</h1>
              {room.items_count !== undefined && room.items_count > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{room.items_count} items</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setIsEditModalOpen(true); setEditData(room); }}>
            <Icon icon={Pencil} size="xs" /> Edit Room
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Are you sure you want to delete this room? This cannot be undone.')) {
                deleteRoomMutation.mutate(room.id)
              }
            }}
            isLoading={deleteRoomMutation.isPending}
          >
            <Icon icon={Trash2} size="xs" /> Delete
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room Photos */}
          <Card>
            <CardHeader>
              <CardTitle>Room Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                fileableType="location"
                fileableId={room.id}
                existingImages={room.images || []}
                featuredImage={room.featured_image}
                invalidateQueries={[['locations'], ['locations', room.id]]}
                label="Upload room photos"
              />
            </CardContent>
          </Card>

          {/* Items in This Room */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items in This Room</CardTitle>
              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 p-1 bg-white dark:bg-gray-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'grid'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                  title="Grid view"
                >
                  <Icon icon={LayoutGrid} size="xs" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                  title="List view"
                >
                  <Icon icon={List} size="xs" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingItems ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <ItemCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <ItemListSkeleton key={i} />
                    ))}
                  </Card>
                )
              ) : allItems.length === 0 ? (
                <EmptyState
                  icon={<Icon icon={Package} size="xl" />}
                  title="No items in this room"
                  description="Items assigned to this room will appear here."
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allItems.map((item) => (
                    <Link key={item.id} to={`/items/${item.id}`}>
                      <Card hover className="h-full overflow-hidden group">
                        {/* Image Section */}
                        <div className="aspect-[4/3] relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          {item.featured_image ? (
                            <img
                              src={item.featured_image.url}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                              <Icon icon={Package} size="xl" className="text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                          {/* Category Badge Overlay */}
                          {item.category && (
                            <div className="absolute top-3 left-3">
                              <Badge
                                size="sm"
                                style={{
                                  backgroundColor: item.category.color ? `${item.category.color}` : undefined,
                                  color: '#fff',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                              >
                                {item.category.name}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <CardContent className="py-4">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1 line-clamp-1">{item.name}</h3>
                          {(item.make || item.model) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                              {[item.make, item.model].filter(Boolean).join(' ')}
                            </p>
                          )}

                          {/* Vendor */}
                          {item.vendor && (
                            <Link
                              to="/vendors"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline mb-2"
                            >
                              <Icon icon={Building} size="xs" />
                              <span className="truncate max-w-[120px]">{item.vendor.name}</span>
                            </Link>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {item.install_date && (
                              <div className="flex items-center gap-1">
                                <Icon icon={Calendar} size="xs" className="text-gray-400 dark:text-gray-500" />
                                <span>{formatDate(item.install_date)}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <ItemList items={allItems} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Room Details */}
          <Card>
            <CardHeader>
              <CardTitle>Room Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {room.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{room.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paint Colors Section */}
          <Card>
            <CardHeader className="border-b border-gray-200 dark:border-gray-800">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  Paint Colors
                  <HelpTooltip position="right">
                    Track paint colors used in this room. You can also use AI to analyze wall colors from photos.
                  </HelpTooltip>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAnalyzeModalOpen(true)}
                  >
                    <Icon icon={Sparkles} size="xs" /> Analyze Wall Color
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingPaintColor(null)
                      setPaintColorFormData({
                        brand: '', color_name: 'New Color', hex_code: '', rgb_r: null, rgb_g: null, rgb_b: null, cmyk_c: null, cmyk_m: null, cmyk_y: null, cmyk_k: null, purchase_url: '', product_url: '',
                      })
                    }}
                  >
                    <Icon icon={Plus} size="xs" /> Add Color
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {room.paint_colors && room.paint_colors.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {room.paint_colors.map((color) => (
                    <div key={color.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div
                        className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                        style={getColorSwatchStyle(color)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {color.color_name}
                        </div>
                        {color.brand && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{color.brand}</div>
                        )}
                        {(color.hex_code || (color.rgb_r !== null && color.rgb_g !== null && color.rgb_b !== null)) && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {color.hex_code || `RGB(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {color.purchase_url && (
                          <a
                            href={color.purchase_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            <Icon icon={ExternalLink} size="xs" />
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPaintColor(color)
                            setPaintColorFormData({
                              brand: color.brand || '',
                              color_name: color.color_name,
                              hex_code: color.hex_code || '',
                              rgb_r: color.rgb_r ?? null,
                              rgb_g: color.rgb_g ?? null,
                              rgb_b: color.rgb_b ?? null,
                              purchase_url: color.purchase_url || '',
                              product_url: color.product_url || '',
                            })
                          }}
                        >
                          <Icon icon={Pencil} size="xs" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this paint color?')) {
                              deletePaintColorMutation.mutate({ locationId: room.id, id: color.id })
                            }
                          }}
                        >
                          <Icon icon={Trash2} size="xs" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No paint colors added yet.</p>
              )}

              {(editingPaintColor || paintColorFormData.color_name) && (
                <PaintColorForm
                  paintColor={editingPaintColor}
                  onSubmit={(data) => {
                    if (!room) return
                    if (editingPaintColor) {
                      updatePaintColorMutation.mutate({ locationId: room.id, id: editingPaintColor.id, data })
                    } else {
                      createPaintColorMutation.mutate({ locationId: room.id, data })
                    }
                  }}
                  onCancel={() => {
                    setEditingPaintColor(null)
                    setPaintColorFormData({
                      brand: '', color_name: '', hex_code: '', rgb_r: null, rgb_g: null, rgb_b: null, cmyk_c: null, cmyk_m: null, cmyk_y: null, cmyk_k: null, purchase_url: '', product_url: '',
                    })
                  }}
                  isLoading={createPaintColorMutation.isPending || updatePaintColorMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Room Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Room"
        description="Update room details"
      >
        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            value={editData.name || ''}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Icon (optional)
            </label>
            <IconPicker
              value={editData.icon || ''}
              onChange={(icon) => setEditData({ ...editData, icon })}
              placeholder="Select an icon"
            />
          </div>
          <Textarea
            label="Notes"
            value={editData.notes || ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            placeholder="Add any notes about this room..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateRoomMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Analyze Wall Color Modal */}
      <Modal
        isOpen={isAnalyzeModalOpen}
        onClose={() => {
          setIsAnalyzeModalOpen(false)
          setSelectedImageId(null)
          setAnalyzeResults(null)
        }}
        title="Analyze Wall Color"
        description="Select a photo of the room to identify paint colors using AI"
      >
        <div className="p-6 space-y-4">
          {room.images && room.images.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Room Photo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImageId(image.id)}
                      className={`
                        relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                        ${selectedImageId === image.id
                          ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <img
                        src={image.url}
                        alt={image.original_name}
                        className="w-full h-full object-cover"
                      />
                      {selectedImageId === image.id && (
                        <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                          <div className="bg-primary-500 text-white rounded-full p-1.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedImageId && !analyzeResults && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleAnalyze}
                    isLoading={analyzeMutation.isPending}
                  >
                    <Icon icon={Sparkles} size="xs" /> Analyze
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="mb-2">No photos uploaded yet.</p>
              <p className="text-sm">Please upload room photos first before analyzing wall colors.</p>
            </div>
          )}

          {analyzeResults && analyzeResults.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Suggested Colors:
              </div>
              {analyzeResults.map((color, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div
                    className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                    style={{
                      backgroundColor: color.hex_code || (color.rgb_r !== null && color.rgb_g !== null && color.rgb_b !== null
                        ? `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`
                        : '#cccccc'),
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {color.color_name}
                    </div>
                    {color.brand && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{color.brand}</div>
                    )}
                    {(color.hex_code || (color.rgb_r !== null && color.rgb_g !== null && color.rgb_b !== null)) && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {color.hex_code || `RGB(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSelectAnalyzedColor(color)}
                  >
                    Use This
                  </Button>
                </div>
              ))}
            </div>
          )}

          {analyzeResults && analyzeResults.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No colors identified. Try a different photo.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAnalyzeModalOpen(false)
                setSelectedImageId(null)
                setAnalyzeResults(null)
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
