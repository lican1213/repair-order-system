export type OrderStatus = '新报修' | '已联系' | '已预约' | '已上门' | '已完成' | '需复查' | '未成交'

export type FollowupStatus = '未回访' | '已回访' | '客户有问题' | '无需回访'

export interface Order {
  id: number
  order_no: string
  customer_name: string
  phone: string
  community: string
  address: string
  appliance_type: string
  brand_model: string | null
  fault_description: string
  preferred_time: string | null
  scheduled_at: string | null
  is_urgent: boolean
  image_paths: string | null
  status: OrderStatus
  followup_status: FollowupStatus
  repair_result: string | null
  parts_used: string | null
  final_fee: number | null
  remark: string | null
  repair_images: string | null
  warranty_until: string | null
  warranty_token: string | null
  warranty_note: string | null
  source: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  latitude: number | null
  longitude: number | null
  location_address: string | null
}

export interface OrderListResponse {
  items: Order[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface DashboardSummary {
  today_count: number
  new_count: number
  followup_count: number
  month_completed_count: number
  month_income: number
  recent_orders: Order[]
}

export interface OrderUpdateRequest {
  status?: OrderStatus
  followup_status?: FollowupStatus
  scheduled_at?: string
  repair_result?: string
  parts_used?: string
  final_fee?: number
  remark?: string
  repair_images?: string
  warranty_until?: string
  warranty_note?: string
  completed_at?: string
}
