import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { errorMessage } from '../api/errors'
import type { User } from '../types'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem('access_token')
  )

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      setIsAuthenticated(true)
      queryClient.invalidateQueries({ queryKey: ['user'] })
      navigate('/app')
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => {
      toast.success('Account created. Sign in to continue.')
      navigate('/login', { state: { email: user.email } })
    },
  })

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setIsAuthenticated(false)
    queryClient.clear()
    navigate('/login')
    toast.success('Signed out')
  }, [navigate, queryClient])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
  }, [])

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    loginError: loginMutation.error ? errorMessage(loginMutation.error, 'Sign in failed. Try again.') : null,
    registerError: registerMutation.error
      ? errorMessage(registerMutation.error, 'Could not create the account. Try again.')
      : null,
  }
}
