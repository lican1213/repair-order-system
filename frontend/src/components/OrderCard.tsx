import type { Order } from '../types/order'
import StatusBadge from './StatusBadge'

interface OrderCardProps {
  order: Order
  onClick?: () => void
}

export default function OrderCard({ order, onClick }: OrderCardProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{order.order_no}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="font-medium text-base mb-1">{order.customer_name}</div>
      <div className="text-sm text-gray-600 mb-1">
        {order.appliance_type}
        {order.brand_model ? ` · ${order.brand_model}` : ''}
      </div>
      <div className="text-sm text-gray-500 truncate">{order.fault_description}</div>
      {order.is_urgent && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
          紧急
        </span>
      )}
    </div>
  )
}
