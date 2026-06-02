import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import { getShopInfo } from '../api/public'
import { changePassword } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { canManageSystemUsers, canManageUsedAppliances } from '../utils/permissions'
import type { ShopInfoResponse } from '../types/public'

export default function AdminProfile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [shopInfo, setShopInfo] = useState<ShopInfoResponse | null>(null)
  const canManageUsers = canManageSystemUsers(user?.role)
  const canManageUsed = canManageUsedAppliances(user?.role)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin', { replace: true })
  }

  const resetPasswordForm = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPwError('')
  }

  const handleTogglePasswordForm = () => {
    if (showPasswordForm) {
      resetPasswordForm()
    }
    setShowPasswordForm(!showPasswordForm)
  }

  const handleChangePassword = async () => {
    setPwError('')

    // Client-side validation
    if (!oldPassword) {
      setPwError('请输入旧密码')
      return
    }
    if (newPassword.length < 6) {
      setPwError('新密码至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('新密码与确认密码不一致')
      return
    }
    if (newPassword === oldPassword) {
      setPwError('新密码不能与旧密码相同')
      return
    }

    setPwLoading(true)
    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      // Success: force logout and redirect to login
      logout()
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? '修改失败，请重试'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
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

        {/* Shop info card */}
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
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">当前权限</span>
              <span>{user ? (user.role === 'admin' ? '店主' : user.role === 'staff' ? '师傅' : '只读') : '-'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">系统版本</span>
              <span>v1.4</span>
            </div>
          </div>
        </div>

        {/* Change password section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <button
            type="button"
            className="w-full flex justify-between items-center text-sm font-medium text-gray-700"
            onClick={handleTogglePasswordForm}
          >
            <span>修改密码</span>
            <span className="text-gray-400">{showPasswordForm ? '▲' : '▼'}</span>
          </button>

          {showPasswordForm && (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void handleChangePassword()
              }}
            >
              <div>
                <label htmlFor="old-password" className="block text-sm text-gray-500 mb-1">旧密码</label>
                <input
                  id="old-password"
                  name="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入当前密码"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm text-gray-500 mb-1">新密码</label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm text-gray-500 mb-1">确认新密码</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
              </div>

              {pwError && (
                <p className="text-red-500 text-sm">{pwError}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={pwLoading}
              >
                {pwLoading ? '提交中...' : '确认修改'}
              </Button>
            </form>
          )}
        </div>

        {canManageUsers && (
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="mb-4 flex min-h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 active:bg-gray-50"
          >
            <span>账号管理</span>
            <span className="text-gray-400">›</span>
          </button>
        )}

        {canManageUsed && (
          <button
            type="button"
            onClick={() => navigate('/admin/used-appliances')}
            className="mb-4 flex min-h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 active:bg-gray-50"
          >
            <span>二手家电管理</span>
            <span className="text-gray-400">›</span>
          </button>
        )}

        <Button variant="danger" fullWidth onClick={handleLogout}>
          退出登录
        </Button>
      </div>
      <BottomNav />
    </div>
  )
}
