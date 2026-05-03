import client from './client'
import type { LoginRequest, TokenResponse, User } from '../types/user'

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/api/auth/login', data)
  localStorage.setItem('token', res.data.access_token)
  return res.data
}

export async function getMe(): Promise<User> {
  const res = await client.get<User>('/api/auth/me')
  return res.data
}

export function logout(): void {
  localStorage.removeItem('token')
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  confirm_password: string
}

export async function changePassword(
  data: ChangePasswordRequest,
): Promise<{ message: string }> {
  const res = await client.post<{ message: string }>(
    '/api/auth/change-password',
    data,
  )
  return res.data
}
