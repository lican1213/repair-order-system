import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import { createOrder } from '../api/orders'
import { getUsers } from '../api/users'
import { useAuth } from '../hooks/useAuth'
import type { OrderCreateRequest, ServiceType } from '../types/order'
import type { User } from '../types/user'
import { APPLIANCE_TYPES, ORDER_STATUSES, SERVICE_TYPES } from '../utils/constants'
import { getCurrentDateTimeLocalString, isPastDateTime } from '../utils/date'
import { getFaultDescriptionCopy } from '../utils/orderCopy'
import { canWriteOrders } from '../utils/permissions'

function getPhoneError(phone: string): string {
  const value = phone.trim()
  if (!value) return '请填写联系电话'
  if (!/^[0-9()\-\s]+$/.test(value)) return '电话只能包含数字、空格、括号和短横线'
  const digitCount = value.replace(/\D/g, '').length
  if (digitCount < 5 || digitCount > 20) return '电话长度需在 5 到 20 位之间'
  return ''
}

export default function OrderCreate() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [staffUsers, setStaffUsers] = useState<User[]>([])
  const [form, setForm] = useState<OrderCreateRequest>({
    customer_name: '',
    phone: '',
    community: '',
    address: '',
    service_type: '维修',
    appliance_type: APPLIANCE_TYPES[0],
    brand_model: '',
    fault_description: '',
    scheduled_at: '',
    is_urgent: false,
    status: '新报修',
    remark: '',
  })

  const canCreate = canWriteOrders(user?.role)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return

    let cancelled = false
    void getUsers()
      .then((items) => {
        if (!cancelled) {
          setStaffUsers(items.filter((item) => item.role === 'staff' && item.is_active))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const faultCopy = useMemo(
    () => getFaultDescriptionCopy(form.service_type || '维修'),
    [form.service_type]
  )

  const update = <K extends keyof OrderCreateRequest>(field: K, value: OrderCreateRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field as string]
        return next
      })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!form.customer_name?.trim()) nextErrors.customer_name = '请填写客户姓名'
    const phoneError = getPhoneError(form.phone || '')
    if (phoneError) nextErrors.phone = phoneError
    if (!form.community?.trim()) nextErrors.community = '请填写小区'
    if (!form.address?.trim()) nextErrors.address = '请填写详细地址'
    if (!form.fault_description?.trim()) nextErrors.fault_description = faultCopy.error
    if (form.appliance_type === '其他' && !form.brand_model?.trim()) {
      nextErrors.brand_model = '选择“其他”时，请填写具体类型或品牌型号'
    }
    if (form.scheduled_at && isPastDateTime(form.scheduled_at)) {
      nextErrors.scheduled_at = '预约时间不能早于当前时间'
    }
    if (form.status === '已预约' && !form.scheduled_at) {
      nextErrors.scheduled_at = '状态为“已预约”时，请填写预约上门时间'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setSaving(true)
    setError('')
    try {
      const created = await createOrder({
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        community: form.community.trim(),
        address: form.address.trim(),
        service_type: form.service_type as ServiceType,
        appliance_type: form.appliance_type,
        brand_model: form.brand_model?.trim() || undefined,
        fault_description: form.fault_description.trim(),
        scheduled_at: form.scheduled_at || undefined,
        is_urgent: form.is_urgent || false,
        status: form.status,
        remark: form.remark?.trim() || undefined,
        assigned_user_id: isAdmin && form.assigned_user_id ? Number(form.assigned_user_id) : undefined,
      })
      navigate(`/admin/orders/${created.id}`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(typeof detail === 'string' ? detail : '创建失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            当前账号无权手动建单。
          </div>
          <Button className="mt-4" onClick={() => navigate('/admin/orders')}>
            返回订单列表
          </Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] text-blue-600"
          >
            ← 返回
          </button>
          <div>
            <h1 className="text-lg font-bold">新建订单</h1>
            <p className="text-sm text-gray-500">电话报修、到店登记都从这里录入</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid gap-3">
              <Select
                label="服务类型"
                options={[...SERVICE_TYPES]}
                value={form.service_type}
                onChange={(event) => update('service_type', event.target.value as ServiceType)}
              />

              <Input
                label="客户姓名"
                value={form.customer_name}
                onChange={(event) => update('customer_name', event.target.value)}
                placeholder="例如：王姐 / 李师傅"
              />
              {fieldErrors.customer_name && <p className="text-sm text-red-600">{fieldErrors.customer_name}</p>}

              <Input
                label="联系电话"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="手机或座机都可以"
              />
              {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone}</p>}

              <Input
                label="小区/街道"
                value={form.community}
                onChange={(event) => update('community', event.target.value)}
              />
              {fieldErrors.community && <p className="text-sm text-red-600">{fieldErrors.community}</p>}

              <Input
                label="详细地址"
                value={form.address}
                onChange={(event) => update('address', event.target.value)}
              />
              {fieldErrors.address && <p className="text-sm text-red-600">{fieldErrors.address}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid gap-3">
              <Select
                label="家电类型"
                options={APPLIANCE_TYPES}
                value={form.appliance_type}
                onChange={(event) => update('appliance_type', event.target.value)}
              />

              <Input
                label={form.appliance_type === '其他' ? '具体类型或品牌型号' : '品牌型号（可选）'}
                value={form.brand_model || ''}
                onChange={(event) => update('brand_model', event.target.value)}
                placeholder={form.appliance_type === '其他' ? '例如：商用制冰机 / XX型号' : '例如：格力 KFR-35GW'}
              />
              {fieldErrors.brand_model && <p className="text-sm text-red-600">{fieldErrors.brand_model}</p>}

              <TextArea
                label={faultCopy.label}
                value={form.fault_description}
                onChange={(event) => update('fault_description', event.target.value)}
                placeholder={faultCopy.placeholder}
              />
              {fieldErrors.fault_description && <p className="text-sm text-red-600">{fieldErrors.fault_description}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">预约上门时间（可选）</label>
                <input
                  type="datetime-local"
                  min={getCurrentDateTimeLocalString()}
                  value={form.scheduled_at || ''}
                  onChange={(event) => update('scheduled_at', event.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-base"
                />
                {fieldErrors.scheduled_at && <p className="mt-1 text-sm text-red-600">{fieldErrors.scheduled_at}</p>}
              </div>

              <Select
                label="初始状态"
                options={ORDER_STATUSES}
                value={form.status}
                onChange={(event) => update('status', event.target.value as OrderCreateRequest['status'])}
              />

              {isAdmin && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">负责人（可选）</label>
                  <select
                    value={form.assigned_user_id ? String(form.assigned_user_id) : ''}
                    onChange={(event) => update('assigned_user_id', event.target.value ? Number(event.target.value) : undefined)}
                    className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-base"
                  >
                    <option value="">暂不分配</option>
                    {staffUsers.map((item) => (
                      <option key={item.id} value={item.id}>{item.username}</option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form.is_urgent}
                  onChange={(event) => update('is_urgent', event.target.checked)}
                  className="h-4 w-4"
                />
                紧急订单，优先处理
              </label>

              <TextArea
                label="备注（可选）"
                value={form.remark || ''}
                onChange={(event) => update('remark', event.target.value)}
                placeholder="例如：客户说中午前在家、先电话联系"
              />
            </div>
          </div>

          <Button type="submit" fullWidth disabled={saving}>
            {saving ? '创建中...' : '创建订单'}
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  )
}
