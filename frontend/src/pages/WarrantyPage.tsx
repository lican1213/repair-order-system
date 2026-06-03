import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Button from '../components/Button'
import { IconShield, IconPhone } from '../components/icons'
import { queryWarranty } from '../api/warranty'
import type { WarrantyResponse } from '../types/public'

export default function WarrantyPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<WarrantyResponse | null>(null)
  const [loading, setLoading] = useState(() => Boolean(token))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    queryWarranty(token)
      .then(setData)
      .catch(() => setError('未找到对应保修记录，请联系师傅确认。'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">查询中...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <Link to="/repair">
            <Button tone="warm">返回报修首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = data.warranty_status === '在保'
    ? 'text-green-700 bg-green-50'
    : data.warranty_status === '已过保'
    ? 'text-red-600 bg-red-50'
    : 'text-gray-600 bg-gray-50'

  return (
    <div className="min-h-screen bg-cream pb-10">
      {/* 暖色渐变头部 */}
      <header className="rounded-b-[28px] bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 px-5 pb-9 pt-7 text-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm">
            <IconShield className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">保修凭证</h1>
            <p className="mt-0.5 text-sm text-white/90">凭此凭证享受同一故障保修</p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-lg px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
          <div className="text-center mb-4 border-b border-orange-50 pb-4">
            <div className="text-lg font-bold text-gray-900">{data.shop_name}</div>
            <a href={`tel:${data.shop_phone}`} className="text-brand-600 font-medium">
              {data.shop_phone}
            </a>
          </div>

          <div className="space-y-1 text-sm">
            <Row label="工单编号" value={data.order_no} />
            <Row label="家电类型" value={data.appliance_type} />
            <Row label="品牌型号" value={data.brand_model} />
            <Row label="维修内容" value={data.repair_result} />
            <Row label="更换配件" value={data.parts_used} />
            <Row label="维修日期" value={data.completed_at?.split('T')[0]} />
            <Row label="保修截止" value={data.warranty_until} />

            <div className="flex justify-between items-center py-2.5 border-t border-orange-50">
              <span className="text-gray-500">保修状态</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                {data.warranty_status}
              </span>
            </div>

            <Row label="保修说明" value={data.warranty_note} />
          </div>
        </div>

        <a
          href={`tel:${data.shop_phone}`}
          className="mt-4 mb-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.99]"
        >
          <IconPhone className="h-5 w-5" />
          一键拨打师傅电话
        </a>

        <Link to="/repair">
          <Button variant="secondary" tone="warm" fullWidth>
            重新报修
          </Button>
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-2.5 border-b border-orange-50">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 text-right max-w-[60%]">{value}</span>
    </div>
  )
}
