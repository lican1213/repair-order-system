export type UsedApplianceStatus = '在售' | '已售' | '下架'

export interface UsedAppliance {
  id: number
  title: string
  category: string
  brand_model: string | null
  price: string | null
  condition_note: string | null
  description: string | null
  image_paths: string[]
  status: UsedApplianceStatus
  contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface UsedApplianceListResponse {
  items: UsedAppliance[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface UsedAppliancePayload {
  title: string
  category: string
  brand_model?: string | null
  price?: string | null
  condition_note?: string | null
  description?: string | null
  image_paths?: string[]
  status: UsedApplianceStatus
  contact_phone?: string | null
}

export interface UsedApplianceUpdatePayload {
  title?: string
  category?: string
  brand_model?: string | null
  price?: string | null
  condition_note?: string | null
  description?: string | null
  image_paths?: string[]
  status?: UsedApplianceStatus
  contact_phone?: string | null
}
