import { useNavigate } from 'react-router-dom'
import { useNewOrderNotifications } from '../hooks/useNewOrderNotifications'
import { ORDER_STATUSES } from '../utils/constants'

export default function NewOrderAlert() {
  const navigate = useNavigate()
  const { count, clear } = useNewOrderNotifications()

  if (count <= 0) return null

  const handleClick = () => {
    clear()
    navigate(`/admin/orders?status=${encodeURIComponent(ORDER_STATUSES[0])}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed left-0 right-0 top-0 z-[60] min-h-[44px] bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md active:bg-red-700"
    >
      有 {count} 个新订单，点击查看
    </button>
  )
}
