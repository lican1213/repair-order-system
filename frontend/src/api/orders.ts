import client from './client'
import type {
  DashboardSummary,
  NewOrderNotificationResponse,
  Order,
  OrderListResponse,
  OrderUpdateRequest,
  ServiceType,
} from '../types/order'

interface OrderListParams {
  status?: string
  followup_status?: string
  service_type?: ServiceType
  created_date_start?: string
  created_date_end?: string
  scheduled_date_start?: string
  scheduled_date_end?: string
  keyword?: string
  page?: number
  page_size?: number
}

export async function getOrders(params: OrderListParams = {}): Promise<OrderListResponse> {
  const res = await client.get<OrderListResponse>('/api/orders', { params })
  return res.data
}

export async function getOrder(id: number): Promise<Order> {
  const res = await client.get<Order>(`/api/orders/${id}`)
  return res.data
}

export async function updateOrder(id: number, data: OrderUpdateRequest): Promise<Order> {
  const res = await client.patch<Order>(`/api/orders/${id}`, data)
  return res.data
}

export async function getTodayOrders(): Promise<Order[]> {
  const res = await client.get<Order[]>('/api/orders/today')
  return res.data
}

export async function getFollowups(): Promise<Order[]> {
  const res = await client.get<Order[]>('/api/orders/followups')
  return res.data
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await client.get<DashboardSummary>('/api/orders/dashboard/summary')
  return res.data
}

export async function getNewOrderNotifications(afterId: number): Promise<NewOrderNotificationResponse> {
  const res = await client.get<NewOrderNotificationResponse>('/api/orders/notifications/new', {
    params: { after_id: afterId },
  })
  return res.data
}

interface ExportParams {
  status?: string
  followup_status?: string
  service_type?: ServiceType
  created_date_start?: string
  created_date_end?: string
  scheduled_date_start?: string
  scheduled_date_end?: string
  keyword?: string
}

export async function exportOrders(params: ExportParams = {}): Promise<Blob> {
  const res = await client.get('/api/export/orders', {
    params,
    responseType: 'blob',
  })
  return res.data as Blob
}
