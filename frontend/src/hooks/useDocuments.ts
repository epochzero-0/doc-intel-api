import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { documentsApi } from '../api/documents'
import type { Document } from '../types'

export function useDocuments() {
  const queryClient = useQueryClient()

  const {
    data: documents = [],
    isLoading,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: documentsApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete document'
      toast.error(message)
    },
  })

  return {
    documents,
    isLoading,
    refetch,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
