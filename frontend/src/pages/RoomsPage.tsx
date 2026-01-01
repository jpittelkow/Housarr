import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locations, paintColors } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Textarea } from '@/components/ui/Textarea'
import { Icon, Plus, Home, MapPin, Pencil, Trash2, HelpTooltip, IconPicker, getIconByName, Sparkles, ExternalLink } from '@/components/ui'
import { PaintColorForm } from '@/components/PaintColorForm'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/utils'
import type { Location, PaintColor } from '@/types'

function RoomSkeleton() {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RoomsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Location | null>(null)
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
  const [formData, setFormData] = useState({ name: '', icon: '', notes: '' })
  const [paintColorData, setPaintColorData] = useState<Partial<PaintColor>>({
    brand: '',
    color_name: 'New Color',
    hex_code: '',
    rgb_r: null,
    rgb_g: null,
    rgb_b: null,
    cmyk_c: null,
    cmyk_m: null,
    cmyk_y: null,
    cmyk_k: null,
    purchase_url: '',
    product_url: '',
  })
  const queryClient = useQueryClient()

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  })

  const { data: roomDetailData } = useQuery({
    queryKey: ['locations', editingRoom?.id],
    queryFn: () => locations.get(editingRoom!.id),
    enabled: !!editingRoom,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Location>) => locations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setIsModalOpen(false)
      setFormData({ name: '', icon: '', notes: '' })
      toast.success('Room added successfully')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to add room'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) => locations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['locations', editingRoom?.id] })
      setEditingRoom(null)
      toast.success('Room updated')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to update room'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => locations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Room deleted')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete room'))
    },
  })

  const createPaintColorMutation = useMutation({
    mutationFn: ({ locationId, data }: { locationId: number; data: Partial<PaintColor> }) => paintColors.create(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', editingRoom?.id] })
      setEditingPaintColor(null)
      setPaintColorData({
        brand: '',
        color_name: '',
        hex_code: '',
        rgb_r: null,
        rgb_g: null,
        rgb_b: null,
        purchase_url: '',
        product_url: '',
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
      queryClient.invalidateQueries({ queryKey: ['locations', editingRoom?.id] })
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
      queryClient.invalidateQueries({ queryKey: ['locations', editingRoom?.id] })
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      name: formData.name,
      icon: formData.icon || null,
      notes: formData.notes || null,
    })
  }

  const handlePaintColorSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoom) return

    const data: Partial<PaintColor> = {
      brand: paintColorData.brand || null,
      color_name: paintColorData.color_name || '',
      hex_code: paintColorData.hex_code || null,
      rgb_r: paintColorData.rgb_r ?? null,
      rgb_g: paintColorData.rgb_g ?? null,
      rgb_b: paintColorData.rgb_b ?? null,
      purchase_url: paintColorData.purchase_url || null,
      product_url: paintColorData.product_url || null,
    }

    if (editingPaintColor) {
      updatePaintColorMutation.mutate({ locationId: editingRoom.id, id: editingPaintColor.id, data })
    } else {
      createPaintColorMutation.mutate({ locationId: editingRoom.id, data })
    }
  }

  const handleAnalyze = () => {
    if (!editingRoom || !selectedImageId) return
    analyzeMutation.mutate({ locationId: editingRoom.id, fileId: selectedImageId })
  }

  const handleSelectAnalyzedColor = (color: typeof analyzeResults extends (infer T)[] | null ? T : never) => {
    if (!editingRoom) return
    setPaintColorData({
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

  const allRooms = roomsData?.locations || []
  const currentRoom = roomDetailData?.location || editingRoom

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            Rooms
            <HelpTooltip position="right">
              Organize your home by rooms. Upload photos, add notes, and track paint colors for each room.
            </HelpTooltip>
          </h1>
          <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">Manage rooms and track paint colors</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Icon icon={Plus} size="xs" /> Add Room
        </Button>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <RoomSkeleton key={i} />
          ))}
        </div>
      ) : allRooms.length === 0 ? (
        <EmptyState
          icon={<Icon icon={Home} size="xl" />}
          title="No rooms yet"
          description="Add rooms to organize your home and track paint colors."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Icon icon={Plus} size="xs" /> Add Room
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allRooms.map((room) => {
            const RoomIcon = room.icon ? getIconByName(room.icon) : null
            return (
              <Card key={room.id} hover className="relative group">
                <Link to={`/rooms/${room.id}`} className="block">
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {room.featured_image ? (
                          <img
                            src={room.featured_image.url}
                            alt={room.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Icon icon={RoomIcon || MapPin} size="sm" className="text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{room.name}</h3>
                          {room.items_count !== undefined && room.items_count > 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{room.items_count} items</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Link>
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEditingRoom(room)
                    }}
                  >
                    <Icon icon={Pencil} size="xs" className="text-gray-400 dark:text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (confirm('Delete this room?')) {
                        deleteMutation.mutate(room.id)
                      }
                    }}
                  >
                    <Icon icon={Trash2} size="xs" className="text-gray-400 dark:text-gray-500" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Room"
        description="Create a new room to organize your home"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Living Room, Kitchen, Master Bedroom"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Icon (optional)
            </label>
            <IconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
              placeholder="Select an icon"
            />
          </div>
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about this room..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Add Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={!!editingRoom}
        onClose={() => { setEditingRoom(null); setEditingPaintColor(null); }}
        title="Edit Room"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingRoom) {
              updateMutation.mutate({
                id: editingRoom.id,
                data: {
                  name: editingRoom.name,
                  icon: editingRoom.icon,
                  notes: editingRoom.notes,
                },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={editingRoom?.name || ''}
            onChange={(e) => setEditingRoom(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Icon (optional)
            </label>
            <IconPicker
              value={editingRoom?.icon || ''}
              onChange={(icon) => setEditingRoom(prev => prev ? { ...prev, icon } : null)}
              placeholder="Select an icon"
            />
          </div>
          <Textarea
            label="Notes"
            value={editingRoom?.notes || ''}
            onChange={(e) => setEditingRoom(prev => prev ? { ...prev, notes: e.target.value } : null)}
            placeholder="Add any notes about this room..."
          />

          {editingRoom && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room Photos</label>
              <ImageUpload
                fileableType="location"
                fileableId={editingRoom.id}
                existingImages={currentRoom?.images || []}
                featuredImage={currentRoom?.featured_image}
                invalidateQueries={[['locations'], ['locations', editingRoom.id]]}
                label="Upload room photos"
              />
            </div>
          )}

          {/* Paint Colors Section */}
          {editingRoom && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paint Colors</label>
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
                      setPaintColorData({
                        brand: '',
                        color_name: 'New Color', // Set default name so form appears
                        hex_code: '',
                        rgb_r: null,
                        rgb_g: null,
                        rgb_b: null,
                        cmyk_c: null,
                        cmyk_m: null,
                        cmyk_y: null,
                        cmyk_k: null,
                        purchase_url: '',
                        product_url: '',
                      })
                    }}
                  >
                    <Icon icon={Plus} size="xs" /> Add Color
                  </Button>
                </div>
              </div>

              {/* Paint Colors List */}
              {currentRoom?.paint_colors && currentRoom.paint_colors.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {currentRoom.paint_colors.map((color) => (
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
                            setPaintColorData({
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
                              deletePaintColorMutation.mutate({ locationId: editingRoom.id, id: color.id })
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

              {/* Paint Color Form */}
              {(editingPaintColor || paintColorData.color_name) && (
                <PaintColorForm
                  paintColor={editingPaintColor}
                  onSubmit={(data) => {
                    if (!editingRoom) return
                    if (editingPaintColor) {
                      updatePaintColorMutation.mutate({ locationId: editingRoom.id, id: editingPaintColor.id, data })
                    } else {
                      createPaintColorMutation.mutate({ locationId: editingRoom.id, data })
                    }
                  }}
                  onCancel={() => {
                    setEditingPaintColor(null)
                    setPaintColorData({
                      brand: '',
                      color_name: '',
                      hex_code: '',
                      rgb_r: null,
                      rgb_g: null,
                      rgb_b: null,
                      cmyk_c: null,
                      cmyk_m: null,
                      cmyk_y: null,
                      cmyk_k: null,
                      purchase_url: '',
                      product_url: '',
                    })
                  }}
                  isLoading={createPaintColorMutation.isPending || updatePaintColorMutation.isPending}
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => { setEditingRoom(null); setEditingPaintColor(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
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
          {currentRoom?.images && currentRoom.images.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Room Photo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentRoom.images.map((image) => (
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
