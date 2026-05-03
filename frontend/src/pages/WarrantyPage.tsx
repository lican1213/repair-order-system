import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Button from '../components/Button'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">查询中...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <Link to="/repair">
            <Button>返回报修首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = data.warranty_status === '在保'
    ? 'text-green-600 bg-green-50'
    : data.warranty_status === '已过保'
    ? 'text-red-600 bg-red-50'
    : 'text-gray-600 bg-gray-50'

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-xl font-bold mb-6 text-center">保修凭证</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="text-center mb-4">
            <div className="text-lg font-bold">{data.shop_name}</div>
            <a href={`tel:${data.shop_phone}`} className="text-blue-600">
              {data.shop_phone}
            </a>
          </div>

          <div className="space-y-3 text-sm">
            <Row label="工单编号" value={data.order_no} />
            <Row label="家电类型" value={data.appliance_type} />
            <Row label="品牌型号" value={data.brand_model} />
            <Row label="维修内容" value={data.repair_result} />
            <Row label="更换配件" value={data.parts_used} />
            <Row label="维修日期" value={data.completed_at?.split('T')[0]} />
            <Row label="保修截止" value={data.warranty_until} />

            <div className="flex justify-between items-center py-2 border-t">
              <span className="text-gray-500">保修状态</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {data.warranty_status}
              </span>
            </div>

            <Row label="保修说明" value={data.warranty_note} />
          </div>
        </div>

        <a href={`tel:${data.shop_phone}`}>
          <Button fullWidth className="mb-3">
            📞 一键拨打师傅电话
          </Button>
        </a>

        <Link to="/repair">
          <Button variant="secondary" fullWidth>
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
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 text-right max-w-[60%]">{value}</span>
    </div>
  )
}
