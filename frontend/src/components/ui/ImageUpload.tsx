import { useCallback, useRef, useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { files } from '@/services/api'
import { cn, isMobileDevice } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from './Button'
import { Icon, Camera } from './Icon'
import type { FileRecord, FileableType } from '@/types'

interface ImageUploadProps {
  fileableType: FileableType
  fileableId: number
  existingImages?: FileRecord[]
  featuredImage?: FileRecord
  onUploadComplete?: (file: FileRecord) => void
  onDelete?: (fileId: number) => void
  onSetFeatured?: (file: FileRecord) => void
  invalidateQueries?: string[][]
  multiple?: boolean
  showGallery?: boolean
  label?: string
  avatarMode?: boolean
  className?: string
}

export function ImageUpload({
  fileableType,
  fileableId,
  existingImages = [],
  featuredImage,
  onUploadComplete,
  onDelete,
  onSetFeatured,
  invalidateQueries = [],
  multiple = true,
  showGallery = true,
  label = 'Upload Image',
  avatarMode = false,
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const queryClient = useQueryClient()
  const isMobile = isMobileDevice()

  const uploadMutation = useMutation({
    mutationFn: async ({ file, isFeatured }: { file: File; isFeatured: boolean }) => {
      return files.upload(file, fileableType, fileableId, isFeatured)
    },
    onSuccess: (data) => {
      invalidateQueries.forEach((query) => {
        queryClient.invalidateQueries({ queryKey: query })
      })
      onUploadComplete?.(data.file)
    },
    onError: (error: any) => {
      console.error('Image upload error:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload image'
      const validationErrors = error?.response?.data?.errors || {}
      console.error('Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        errors: validationErrors,
        fileableType,
        fileableId,
      })
      toast.error(errorMessage)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: files.delete,
    onSuccess: (_, fileId) => {
      invalidateQueries.forEach((query) => {
        queryClient.invalidateQueries({ queryKey: query })
      })
      onDelete?.(fileId)
    },
  })

  const setFeaturedMutation = useMutation({
    mutationFn: files.setFeatured,
    onSuccess: (data) => {
      invalidateQueries.forEach((query) => {
        queryClient.invalidateQueries({ queryKey: query })
      })
      onSetFeatured?.(data.file)
    },
  })

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (!fileableId || fileableId <= 0) {
        console.error('Cannot upload: fileableId is invalid', fileableId)
        return
      }

      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      )

      if (droppedFiles.length > 0) {
        // For avatar mode or single file mode, always set as featured
        const isFeatured = avatarMode || !multiple || (existingImages.length === 0 && !featuredImage)
        if (multiple) {
          droppedFiles.forEach((file, index) => {
            uploadMutation.mutate({ file, isFeatured: isFeatured && index === 0 })
          })
        } else {
          uploadMutation.mutate({ file: droppedFiles[0], isFeatured: true })
        }
      }
    },
    [avatarMode, existingImages.length, featuredImage, multiple, uploadMutation, fileableId]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!fileableId || fileableId <= 0) {
        console.error('Cannot upload: fileableId is invalid', fileableId)
        return
      }
      const selectedFiles = Array.from(e.target.files || [])
      if (selectedFiles.length > 0) {
        // For avatar mode, always set as featured. Otherwise, only the first image when no existing
        const isFeatured = avatarMode || (existingImages.length === 0 && !featuredImage)
        if (multiple) {
          selectedFiles.forEach((file, index) => {
            uploadMutation.mutate({ file, isFeatured: isFeatured && index === 0 })
          })
        } else {
          uploadMutation.mutate({ file: selectedFiles[0], isFeatured: true })
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [avatarMode, existingImages.length, featuredImage, multiple, uploadMutation, fileableId]
  )

  // Memoize to prevent array recreation on every render
  const allImages = useMemo(() => {
    const images = [...existingImages]
    if (featuredImage && !images.find((img) => img.id === featuredImage.id)) {
      images.unshift(featuredImage)
    }
    return images
  }, [existingImages, featuredImage])

  if (avatarMode) {
    const currentAvatar = featuredImage || allImages[0]
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="relative">
          {currentAvatar ? (
            <img
              src={currentAvatar.url}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-800"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Camera input for selfies - uses front camera */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {currentAvatar ? 'Change' : 'Upload'}
            </Button>
            {isMobile && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                title="Take a selfie"
              >
                <Icon icon={Camera} size="xs" />
              </Button>
            )}
          </div>
          {currentAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(currentAvatar.id)}
              disabled={deleteMutation.isPending}
              className="text-error-600 hover:text-error-700"
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleFileSelect}
      />
      {/* Camera input - uses rear camera for object photos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex gap-2">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploadMutation.isPending ? (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isMobile ? 'Tap to select from gallery' : 'Drag and drop or click to select'} • JPG, PNG, GIF, WebP
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Camera button - shown on mobile devices */}
        {isMobile && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className={cn(
              'flex flex-col items-center justify-center gap-2 px-6 border-2 border-dashed rounded-lg transition-colors',
              'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20',
              uploadMutation.isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon icon={Camera} size="lg" className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Camera</span>
          </button>
        )}
      </div>

      {showGallery && allImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Images ({allImages.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allImages.map((image) => (
              <div
                key={image.id}
                className={cn(
                  'relative group rounded-lg overflow-hidden border-2 aspect-square',
                  image.is_featured ? 'border-primary-500' : 'border-transparent'
                )}
              >
                <img
                  src={image.url}
                  alt={image.original_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!image.is_featured && (
                      <button
                        type="button"
                        onClick={() => setFeaturedMutation.mutate(image.id)}
                        disabled={setFeaturedMutation.isPending}
                        className="p-1.5 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Set as featured"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(image.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 bg-white dark:bg-gray-800 rounded-md text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {image.is_featured && (
                  <div className="absolute top-1 left-1 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded">
                    Featured
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
