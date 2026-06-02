import type { UserRole } from '../types/user'
import type { Order } from '../types/order'
import type { User } from '../types/user'

export function canWriteOrders(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'staff'
}

export function canAssignOrders(role: UserRole | undefined): boolean {
  return role === 'admin'
}

export function canEditOrder(
  user: Pick<User, 'id' | 'role'> | null | undefined,
  order: Pick<Order, 'assigned_user_id'> | null | undefined,
): boolean {
  if (!user || !order) return false
  if (user.role === 'admin') return true
  if (user.role !== 'staff') return false
  return order.assigned_user_id === null || order.assigned_user_id === user.id
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
