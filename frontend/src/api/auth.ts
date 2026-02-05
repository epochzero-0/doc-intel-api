import api from './axios'
import type { LoginResponse, RegisterRequest, User } from '../types'

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Backend uses OAuth2PasswordRequestForm which expects form data
    const formData = new URLSearchParams()
    formData.append('username', email) // backend expects email in username field
    formData.append('password', password)

    const response = await api.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<User>('/auth/register', data)
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/users/me')
    return response.data
  },
}
