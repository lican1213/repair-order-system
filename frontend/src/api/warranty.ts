import axios from 'axios'
import type { WarrantyResponse } from '../types/public'

export async function queryWarranty(token: string): Promise<WarrantyResponse> {
  const res = await axios.get<WarrantyResponse>(`/api/warranty/${token}`)
  return res.data
}
