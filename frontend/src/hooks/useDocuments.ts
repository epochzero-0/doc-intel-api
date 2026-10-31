import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { documentsApi } from '../api/documents'
import { errorMessage } from '../api/errors'
import type { Document } from '../types'

export function useDocuments() {
  const queryClient = useQueryClient()

  const {
    data: documents = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: documentsApi.getAll,
    // Keep the list fresh while anything is still processing, including uploads from another tab.
    refetchInterval: (query) => (query.state.data?.some((d) => d.status === 'processing') ? 4000 : false),
    select: (docs) => [...docs].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  })

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not delete the document.'))
    },
  })

  return {
    documents,
    isLoading,
    isError,
    refetch,
    deleteDocument: deleteMutation.mutate,
    deletingId: deleteMutation.isPending ? deleteMutation.variables : undefined,
  }
}
