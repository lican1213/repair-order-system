import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import { getShopInfo } from '../api/public'
import { useAuth } from '../hooks/useAuth'
import type { ShopInfoResponse } from '../types/public'

export default function AdminProfile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [shopInfo, setShopInfo] = useState<ShopInfoResponse | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/admin', { replace: true })
  }

  useEffect(() => {
    let cancelled = false

    void getShopInfo()
      .then((info) => {
        if (!cancelled) setShopInfo(info)
      })
      .catch(() => {
        if (!cancelled) setShopInfo(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-lg font-bold mb-4">我的</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">店铺名称</span>
              <span>{shopInfo?.shop_name || '未配置店铺信息'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">店铺电话</span>
              {shopInfo?.shop_phone ? (
                <a href={`tel:${shopInfo.shop_phone}`} className="text-blue-600">
                  {shopInfo.shop_phone}
                </a>
              ) : (
                <span>未配置店铺信息</span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">当前账号</span>
              <span>{user?.username || '-'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">系统版本</span>
              <span>v1.0</span>
            </div>
          </div>
        </div>

        <Button variant="danger" fullWidth onClick={handleLogout}>
          退出登录
        </Button>
      </div>
      <BottomNav />
    </div>
  )
}
