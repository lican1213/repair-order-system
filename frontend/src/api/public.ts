import axios from 'axios'
import type {
  PublicUploadResponse,
  RepairSubmitRequest,
  RepairSubmitResponse,
  ShopInfoResponse,
} from '../types/public'

export async function uploadPublicImages(files: File[]): Promise<PublicUploadResponse> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const res = await axios.post<PublicUploadResponse>('/api/public/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function submitRepair(data: RepairSubmitRequest): Promise<RepairSubmitResponse> {
  const res = await axios.post<RepairSubmitResponse>('/api/public/submit', data)
  return res.data
}

export async function getShopInfo(): Promise<ShopInfoResponse> {
  const res = await axios.get<ShopInfoResponse>('/api/public/shop-info')
  return res.data
}
