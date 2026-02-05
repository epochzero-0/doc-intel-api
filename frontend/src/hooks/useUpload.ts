import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { documentsApi } from '../api/documents'
import type { Document } from '../types'

interface UploadingDoc {
  id: number
  filename: string
  status: 'processing' | 'completed' | 'failed'
}

export function useUpload() {
  const queryClient = useQueryClient()
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDoc[]>([])

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: (data: Document) => {
      setUploadingDocs((prev) => [
        ...prev,
        { id: data.id, filename: data.filename, status: 'processing' },
      ])
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(`Uploading ${data.filename}...`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Upload failed'
      toast.error(message)
    },
  })

  // Poll for status updates
  useEffect(() => {
    const processingDocs = uploadingDocs.filter((d) => d.status === 'processing')
    if (processingDocs.length === 0) return

    const interval = setInterval(async () => {
      for (const doc of processingDocs) {
        try {
          const status = await documentsApi.getStatus(doc.id)
          if (status.status !== 'processing') {
            setUploadingDocs((prev) =>
              prev.map((d) =>
                d.id === doc.id ? { ...d, status: status.status } : d
              )
            )
            queryClient.invalidateQueries({ queryKey: ['documents'] })
            
            if (status.status === 'completed') {
              toast.success(`${doc.filename} is ready!`)
            } else if (status.status === 'failed') {
              toast.error(`${doc.filename} processing failed`)
            }
          }
        } catch (error) {
          console.error('Failed to fetch status:', error)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [uploadingDocs, queryClient])

  const clearCompleted = useCallback(() => {
    setUploadingDocs((prev) => prev.filter((d) => d.status === 'processing'))
  }, [])

  return {
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    uploadingDocs,
    clearCompleted,
  }
}
