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
