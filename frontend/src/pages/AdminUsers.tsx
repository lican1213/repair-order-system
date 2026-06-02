import { useCallback, useEffect, useState } from 'react'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  updateUser,
} from '../api/users'
import { useAuth } from '../hooks/useAuth'
import { canManageSystemUsers } from '../utils/permissions'
import type { User, UserRole } from '../types/user'

const managedRoles: Array<Exclude<UserRole, 'admin'>> = ['staff', 'viewer']

function getApiMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
  if (typeof detail === 'string') return detail
  return '操作失败，请重试'
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function roleLabel(role: UserRole): string {
  if (role === 'admin') return '店主'
  if (role === 'staff') return '师傅'
  return '只读'
}

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('viewer')
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canManage = canManageSystemUsers(user?.role)

  const loadUsers = useCallback(async () => {
    return getUsers()
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!canManage) return

    let cancelled = false
    void loadUsers()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, canManage, loadUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const nextUsername = username.trim()
    if (!nextUsername) {
      setError('请输入用户名')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setSaving(true)
    try {
      await createUser({ username: nextUsername, password, role })
      setUsername('')
      setPassword('')
      setRole('viewer')
      setMessage('账号已创建')
      setUsers(await loadUsers())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (target: User) => {
    setError('')
    setMessage('')
    try {
      await updateUser(target.id, { is_active: !target.is_active })
      setMessage(target.is_active ? '账号已停用' : '账号已启用')
      setUsers(await loadUsers())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    }
  }

  const handleChangeRole = async (target: User, nextRole: Exclude<UserRole, 'admin'>) => {
    setError('')
    setMessage('')
    try {
      await updateUser(target.id, { role: nextRole })
      setMessage('权限已更新')
      setUsers(await loadUsers())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    }
  }

  const handleResetPassword = async (target: User) => {
    const nextPassword = resetPasswords[target.id] || ''
    setError('')
    setMessage('')
    if (nextPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }

    try {
      await resetUserPassword(target.id, { password: nextPassword })
      setResetPasswords((prev) => ({ ...prev, [target.id]: '' }))
      setMessage('密码已重置')
    } catch (err: unknown) {
      setError(getApiMessage(err))
    }
  }

  const handleDelete = async (target: User) => {
    if (!window.confirm(`确定删除账号 ${target.username}？删除后不可恢复。`)) return
    setError('')
    setMessage('')
    try {
      await deleteUser(target.id)
      setMessage('账号已删除')
      setUsers(await loadUsers())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    }
  }

  if (authLoading || (canManage && !loaded)) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4 text-center text-gray-400">加载中...</div>
        <BottomNav />
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4">
          <h1 className="mb-4 text-lg font-bold">账号管理</h1>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            当前账号无权限管理系统账号。
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="mb-4 text-lg font-bold">账号管理</h1>

        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-bold text-gray-900">新建账号</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="new-username" className="mb-1 block text-sm text-gray-500">用户名</label>
              <input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                maxLength={50}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm text-gray-500">初始密码</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="new-role" className="mb-1 block text-sm text-gray-500">权限</label>
              <select
                id="new-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<UserRole, 'admin'>)}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="viewer">只读：只能查看订单</option>
                <option value="staff">师傅：可处理订单</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
          <Button type="submit" fullWidth disabled={saving} className="mt-4">
            {saving ? '创建中...' : '创建账号'}
          </Button>
        </form>

        <div className="mb-3 text-xs text-gray-400">账号总数：{users.length} / 15</div>

        <div className="flex flex-col gap-3">
          {users.map((item) => {
            const isOriginalAdmin = item.username === 'admin' && item.role === 'admin'
            return (
              <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">{item.username}</div>
                    <div className="mt-1 text-xs text-gray-400">
                      创建：{formatDate(item.created_at)} · 最近登录：{formatDate(item.last_login_at)}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.is_active ? '启用' : '停用'}
                  </span>
                </div>

                {isOriginalAdmin ? (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    店主账号拥有全部权限，不能停用、降级、重置或删除。
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-gray-500">权限</label>
                      <select
                        value={item.role}
                        onChange={(e) => handleChangeRole(item, e.target.value as Exclude<UserRole, 'admin'>)}
                        className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {managedRoles.map((nextRole) => (
                          <option key={nextRole} value={nextRole}>{roleLabel(nextRole)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`reset-${item.id}`} className="mb-1 block text-sm text-gray-500">重置密码</label>
                      <div className="flex gap-2">
                        <input
                          id={`reset-${item.id}`}
                          type="password"
                          value={resetPasswords[item.id] || ''}
                          onChange={(e) => setResetPasswords((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          placeholder="新密码"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => void handleResetPassword(item)}
                          className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-medium text-white"
                        >
                          重置
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(item)}
                        className="min-h-[44px] rounded-lg border border-gray-200 text-sm font-medium text-gray-700"
                      >
                        {item.is_active ? '停用账号' : '启用账号'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="min-h-[44px] rounded-lg border border-red-200 text-sm font-medium text-red-600"
                      >
                        删除账号
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
