import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/admin/dashboard', label: '首页', icon: '🏠' },
  { path: '/admin/today', label: '今日', icon: '📅' },
  { path: '/admin/orders', label: '订单', icon: '📋' },
  { path: '/admin/profile', label: '我的', icon: '👤' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-14 z-50">
      {tabs.map((tab) => {
        const active = location.pathname.startsWith(tab.path)
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              active ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-xs mt-0.5">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
