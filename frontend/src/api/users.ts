import client from './client'
import type {
  ResetUserPasswordRequest,
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from '../types/user'

export async function getUsers(): Promise<User[]> {
  const res = await client.get<User[]>('/api/auth/users')
  return res.data
}

export async function createUser(data: UserCreateRequest): Promise<User> {
  const res = await client.post<User>('/api/auth/users', data)
  return res.data
}

export async function updateUser(id: number, data: UserUpdateRequest): Promise<User> {
  const res = await client.patch<User>(`/api/auth/users/${id}`, data)
  return res.data
}

export async function resetUserPassword(
  id: number,
  data: ResetUserPasswordRequest,
): Promise<{ message: string }> {
  const res = await client.post<{ message: string }>(
    `/api/auth/users/${id}/reset-password`,
    data,
  )
  return res.data
}

export async function deleteUser(id: number): Promise<{ message: string }> {
  const res = await client.delete<{ message: string }>(`/api/auth/users/${id}`)
  return res.data
}
