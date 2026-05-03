import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import StatusBadge from '../components/StatusBadge'
import { getDashboardSummary } from '../api/orders'
import type { DashboardSummary } from '../types/order'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    getDashboardSummary().then(setData).catch(() => {})
  }, [])

  const cards = [
    { label: '今日预约', value: data?.today_count ?? '-', onClick: () => navigate('/admin/today') },
    { label: '新报修', value: data?.new_count ?? '-', onClick: () => navigate('/admin/orders?status=新报修') },
    { label: '待回访', value: data?.followup_count ?? '-', onClick: () => navigate('/admin/followups') },
    { label: '本月已完成', value: data?.month_completed_count ?? '-', onClick: () => navigate('/admin/orders?status=已完成') },
    { label: '本月收入', value: data?.month_income != null ? `¥${data.month_income.toFixed(0)}` : '-', onClick: undefined },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-lg font-bold mb-4">维修工单管理</h1>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {cards.map((card) => (
            <div
              key={card.label}
              onClick={card.onClick}
              className={`bg-white rounded-lg border border-gray-200 p-4 ${card.onClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
            >
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-2xl font-bold mt-1">{card.value}</div>
            </div>
          ))}
        </div>

        <h2 className="text-base font-bold mb-3">最近订单</h2>
        <div className="flex flex-col gap-3">
          {data?.recent_orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{order.order_no}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="font-medium">{order.customer_name}</div>
              <div className="text-sm text-gray-500">
                {order.appliance_type} · {order.fault_description.slice(0, 20)}
              </div>
            </div>
          ))}
          {data?.recent_orders.length === 0 && (
            <p className="text-gray-400 text-center py-8">暂无订单</p>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
