import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import StatusBadge from '../components/StatusBadge'
import { getTodayOrders } from '../api/orders'
import type { Order } from '../types/order'

export default function TodayOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTodayOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-lg font-bold mb-4">今日预约</h1>

        {loading && <p className="text-gray-400 text-center py-8">加载中...</p>}

        {!loading && orders.length === 0 && (
          <p className="text-gray-400 text-center py-8">今天暂无已确认上门时间的订单</p>
        )}

        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{order.order_no}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="font-medium">{order.customer_name}</div>
              <div className="text-sm text-gray-600">{order.appliance_type}{order.brand_model ? ` · ${order.brand_model}` : ''}</div>
              <div className="text-sm text-blue-600 mt-1">
                预约: {order.scheduled_at?.replace('T', ' ').slice(0, 16)}
              </div>
              <div className="flex gap-2 mt-3">
                <a href={`tel:${order.phone}`} className="flex-1 min-h-[44px] flex items-center justify-center bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                  📞 拨打
                </a>
                <button onClick={() => navigate(`/admin/orders/${order.id}`)} className="flex-1 min-h-[44px] flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
