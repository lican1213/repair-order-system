import axios from 'axios'
import client from './client'
import type {
  UsedAppliance,
  UsedApplianceListResponse,
  UsedAppliancePayload,
  UsedApplianceUpdatePayload,
} from '../types/usedAppliance'
import type { PublicUploadResponse } from '../types/public'

interface PublicUsedApplianceParams {
  category?: string
  page?: number
  page_size?: number
}

interface AdminUsedApplianceParams extends PublicUsedApplianceParams {
  status?: string
  keyword?: string
}

export async function getPublicUsedAppliances(
  params: PublicUsedApplianceParams = {}
): Promise<UsedApplianceListResponse> {
  const res = await axios.get<UsedApplianceListResponse>('/api/used-appliances', { params })
  return res.data
}

export async function getPublicUsedAppliance(id: number): Promise<UsedAppliance> {
  const res = await axios.get<UsedAppliance>(`/api/used-appliances/${id}`)
  return res.data
}

export async function getAdminUsedAppliances(
  params: AdminUsedApplianceParams = {}
): Promise<UsedApplianceListResponse> {
  const res = await client.get<UsedApplianceListResponse>('/api/admin/used-appliances', { params })
  return res.data
}

export async function createUsedAppliance(data: UsedAppliancePayload): Promise<UsedAppliance> {
  const res = await client.post<UsedAppliance>('/api/admin/used-appliances', data)
  return res.data
}

export async function updateUsedAppliance(
  id: number,
  data: UsedApplianceUpdatePayload
): Promise<UsedAppliance> {
  const res = await client.patch<UsedAppliance>(`/api/admin/used-appliances/${id}`, data)
  return res.data
}

export async function uploadUsedApplianceImages(files: File[]): Promise<PublicUploadResponse> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const res = await client.post<PublicUploadResponse>('/api/upload/used', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function deleteUsedAppliance(id: number): Promise<{ message: string; deleted_files: number }> {
  const res = await client.delete(`/api/admin/used-appliances/${id}`)
  return res.data
}
