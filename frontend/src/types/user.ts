export type UserRole = 'admin' | 'staff' | 'viewer'

export interface User {
  id: number
  username: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserCreateRequest {
  username: string
  password: string
  role: Exclude<UserRole, 'admin'>
}

export interface UserUpdateRequest {
  role?: Exclude<UserRole, 'admin'>
  is_active?: boolean
}

export interface ResetUserPasswordRequest {
  password: string
}
