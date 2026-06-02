import type { UserRole } from '../types/user'

export function canWriteOrders(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'staff'
}

export function canExportOrders(role: UserRole | undefined): boolean {
  return role === 'admin'
}

export function canManageUsedAppliances(role: UserRole | undefined): boolean {
  return role === 'admin'
}

export function canManageSystemUsers(role: UserRole | undefined): boolean {
  return role === 'admin'
}
