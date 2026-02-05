import api from './axios'
import type { ChatRequest, ChatResponse, SearchResult } from '../types'

export const chatApi = {
  chat: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/documents/chat', data)
    return response.data
  },

  search: async (data: ChatRequest): Promise<SearchResult[]> => {
    const response = await api.post<SearchResult[]>('/documents/search', data)
    return response.data
  },
}
