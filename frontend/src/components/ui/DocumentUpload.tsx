import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { files } from '@/services/api'
import { cn, formatFileSize } from '@/lib/utils'
import { Icon, FileText, Trash2, Download, Upload } from './Icon'
import type { FileRecord, FileableType } from '@/types'

interface DocumentUploadProps {
  fileableType: FileableType
  fileableId: number
  existingDocuments?: FileRecord[]
  onUploadComplete?: (file: FileRecord) => void
  onDelete?: (fileId: number) => void
  invalidateQueries?: string[][]
  multiple?: boolean
  label?: string
  accept?: string
  className?: string
}

export function DocumentUpload({
  fileableType,
  fileableId,
  existingDocuments = [],
  onUploadComplete,
  onDelete,
  invalidateQueries = [],
  multiple = true,
  label = 'Upload Documents',
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  className,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return files.upload(file, fileableType, fileableId, false)
    },
    onSuccess: (data) => {
      invalidateQueries.forEach((query) => {
        queryClient.invalidateQueries({ queryKey: query })
      })
      onUploadComplete?.(data.file)
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const isAcceptedFile = (file: File) => {
    if (!accept) return true
    const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase())
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return ext === type
      }
      // Handle MIME type patterns like 'application/pdf'
      return file.type === type
    })
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const droppedFiles = Array.from(e.dataTransfer.files).filter(isAcceptedFile)

      if (droppedFiles.length > 0) {
        if (multiple) {
          droppedFiles.forEach((file) => {
            uploadMutation.mutate(file)
          })
        } else {
          uploadMutation.mutate(droppedFiles[0])
        }
      }
    },
    [multiple, uploadMutation]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      if (selectedFiles.length > 0) {
        if (multiple) {
          selectedFiles.forEach((file) => {
            uploadMutation.mutate(file)
          })
        } else {
          uploadMutation.mutate(selectedFiles[0])
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [multiple, uploadMutation]
  )

  const getFileIcon = (_mimeType: string | null) => {
    // Could be extended to show different icons for different file types
    return FileText
  }

  return (
    <div className={cn('space-y-4', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileSelect}
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Icon icon={Upload} size="sm" className="text-gray-500 dark:text-gray-400" />
          </div>
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
                Drag and drop or click to select
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                PDF, Word, Excel, Text files
              </p>
            </>
          )}
        </div>
      </div>

      {existingDocuments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Documents ({existingDocuments.length})
          </p>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {existingDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Icon icon={getFileIcon(doc.mime_type)} size="sm" className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate" title={doc.original_name}>
                      {doc.original_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.size ? formatFileSize(doc.size) : 'Unknown size'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Icon icon={Download} size="xs" />
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Icon icon={Trash2} size="xs" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
