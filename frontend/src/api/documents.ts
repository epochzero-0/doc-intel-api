import api from './axios'
import type { Document, DocumentStatus } from '../types'

export const documentsApi = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getAll: async (): Promise<Document[]> => {
    const response = await api.get<Document[]>('/documents')
    return response.data
  },

  getStatus: async (docId: number): Promise<DocumentStatus> => {
    const response = await api.get<DocumentStatus>(`/documents/${docId}/status`)
    return response.data
  },

  delete: async (docId: number): Promise<void> => {
    await api.delete(`/documents/${docId}`)
  },
}
