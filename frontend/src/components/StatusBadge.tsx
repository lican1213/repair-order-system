import type { OrderStatus } from '../types/order'
import { STATUS_COLORS } from '../utils/constants'

interface StatusBadgeProps {
  status: OrderStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  )
}
