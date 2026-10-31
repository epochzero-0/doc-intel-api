import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { documentsApi } from '../api/documents'
import { errorMessage } from '../api/errors'
import type { Document } from '../types'

export const ACCEPTED = ['.pdf', '.docx', '.txt']

// Uploads a file, then polls GET /documents/{id}/status until it leaves 'processing'.
export function useUpload() {
  const queryClient = useQueryClient()
  const [watching, setWatching] = useState<{ id: number; filename: string }[]>([])

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: (data: Document) => {
      setWatching((prev) => [...prev, { id: data.id, filename: data.filename }])
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Upload failed. Try again.'))
    },
  })

  useEffect(() => {
    if (watching.length === 0) return

    const interval = setInterval(async () => {
      for (const doc of watching) {
        try {
          const { status } = await documentsApi.getStatus(doc.id)
          if (status === 'processing') continue
          setWatching((prev) => prev.filter((d) => d.id !== doc.id))
          queryClient.invalidateQueries({ queryKey: ['documents'] })
          if (status === 'completed') toast.success(`${doc.filename} is ready`)
          else toast.error(`${doc.filename} could not be processed`)
        } catch {
          // a missed poll is retried on the next tick
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [watching, queryClient])

  const upload = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ACCEPTED.includes(ext)) {
      toast.error(`${file.name} is not a PDF, DOCX or TXT file.`)
      return
    }
    uploadMutation.mutate(file)
  }

  return {
    upload,
    isUploading: uploadMutation.isPending,
    uploadingName: uploadMutation.isPending ? uploadMutation.variables?.name : undefined,
  }
}
