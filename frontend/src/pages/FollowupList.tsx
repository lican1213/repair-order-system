import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { getFollowups, updateOrder } from '../api/orders'
import type { Order, FollowupStatus } from '../types/order'

export default function FollowupList() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void getFollowups()
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch(() => {
        if (!cancelled) setError('待回访列表加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleMark = async (id: number, status: FollowupStatus) => {
    try {
      await updateOrder(id, { followup_status: status })
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } catch {
      setError('回访状态保存失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-lg font-bold mb-4">待回访</h1>

        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

        {loading && <p className="text-gray-400 text-center py-8">加载中...</p>}

        {!loading && orders.length === 0 && (
          <p className="text-gray-400 text-center py-8">暂无待回访订单</p>
        )}

        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{order.order_no}</span>
                <span className="text-xs text-gray-400">
                  完成: {order.completed_at?.split('T')[0]}
                </span>
              </div>
              <div className="font-medium">{order.customer_name}</div>
              <div className="text-sm text-gray-600">{order.appliance_type}</div>
              {order.warranty_until && (
                <div className="text-xs text-gray-400">保修至: {order.warranty_until}</div>
              )}
              <div className="flex gap-2 mt-3">
                <a href={`tel:${order.phone}`} className="min-h-[44px] flex items-center justify-center bg-green-50 text-green-700 rounded-lg text-sm font-medium px-3">
                  📞 拨打
                </a>
                <button onClick={() => navigate(`/admin/orders/${order.id}`)} className="min-h-[44px] flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg text-sm font-medium px-3">
                  详情
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleMark(order.id, '已回访')} className="flex-1 min-h-[44px] bg-green-600 text-white rounded-lg text-sm font-medium">
                  已回访
                </button>
                <button onClick={() => handleMark(order.id, '客户有问题')} className="flex-1 min-h-[44px] bg-yellow-500 text-white rounded-lg text-sm font-medium">
                  有问题
                </button>
                <button onClick={() => handleMark(order.id, '无需回访')} className="flex-1 min-h-[44px] bg-gray-400 text-white rounded-lg text-sm font-medium">
                  无需回访
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
