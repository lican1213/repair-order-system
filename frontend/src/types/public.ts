export interface RepairSubmitRequest {
  customer_name: string
  phone: string
  community: string
  address: string
  appliance_type: string
  brand_model?: string
  fault_description: string
  preferred_time?: string
  is_urgent?: boolean
  image_paths?: string[]
  latitude?: number
  longitude?: number
  location_address?: string
}

export interface RepairSubmitResponse {
  order_no: string
  message: string
  shop_phone: string
}

export interface PublicUploadResponse {
  paths: string[]
}

export interface ShopInfoResponse {
  shop_name: string
  shop_phone: string
}

export interface WarrantyResponse {
  order_no: string
  appliance_type: string
  brand_model: string | null
  repair_result: string | null
  parts_used: string | null
  completed_at: string | null
  warranty_until: string | null
  warranty_status: string
  warranty_note: string | null
  shop_name: string
  shop_phone: string
}
