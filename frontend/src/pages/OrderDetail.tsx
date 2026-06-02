import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ImagePreviewModal from '../components/ImagePreviewModal'
import StatusBadge from '../components/StatusBadge'
import { getOrder, updateOrder } from '../api/orders'
import { useAuth } from '../hooks/useAuth'
import { ORDER_STATUSES, FOLLOWUP_STATUSES } from '../utils/constants'
import { copyText } from '../utils/clipboard'
import { buildWarrantyUrl } from '../utils/url'
import { getCurrentDateTimeLocalString, getTodayDateString, isPastDateTime, validateWarrantyDate } from '../utils/date'
import { parseImagePaths } from '../utils/images'
import { canWriteOrders } from '../utils/permissions'
import type { Order, OrderUpdateRequest } from '../types/order'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(() => Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copyNotice, setCopyNotice] = useState('')
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})

  const [form, setForm] = useState<OrderUpdateRequest>({})
  const canEditOrder = canWriteOrders(user?.role)

  // 字段级日期错误（useMemo 派生，见下方）

  useEffect(() => {
    if (!id) return
    getOrder(Number(id))
      .then((o) => {
        setOrder(o)
        setForm({
          status: o.status,
          followup_status: o.followup_status,
          scheduled_at: o.scheduled_at?.slice(0, 16) || '',
          repair_result: o.repair_result || '',
          parts_used: o.parts_used || '',
          final_fee: o.final_fee ?? undefined,
          warranty_until: o.warranty_until || '',
          warranty_note: o.warranty_note || '',
          remark: o.remark || '',
        })
      })
      .catch(() => setError('订单不存在'))
      .finally(() => setLoading(false))
  }, [id])

  // 实时校验日期字段（纯派生，用 useMemo）
  const dateErrors = useMemo<Record<string, string>>(() => {
    const errs: Record<string, string> = {}
    if (form.scheduled_at && isPastDateTime(form.scheduled_at)) {
      errs.scheduled_at = '预约时间不能早于当前时间'
    }
    if (form.completed_at && isPastDateTime(form.completed_at as unknown as string)) {
      errs.completed_at = '完成时间不能早于当前时间'
    }
    const warrantyErr = validateWarrantyDate(
      form.warranty_until || '',
      form.completed_at as unknown as string || order?.completed_at
    )
    if (warrantyErr) errs.warranty_until = warrantyErr
    return errs
  }, [form.scheduled_at, form.completed_at, form.warranty_until, order?.completed_at])

  const update = (field: string, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!id) return
    // 检查日期错误
    if (Object.keys(dateErrors).length > 0) {
      const firstField = Object.keys(dateErrors)[0]
      fieldRefs.current[firstField]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const data: OrderUpdateRequest = {}
      if (form.status) data.status = form.status
      if (form.followup_status) data.followup_status = form.followup_status
      if (form.scheduled_at) data.scheduled_at = form.scheduled_at
      if (form.repair_result !== undefined) data.repair_result = form.repair_result
      if (form.parts_used !== undefined) data.parts_used = form.parts_used
      if (form.final_fee !== undefined) data.final_fee = form.final_fee
      if (form.warranty_until !== undefined) data.warranty_until = form.warranty_until
      if (form.warranty_note !== undefined) data.warranty_note = form.warranty_note
      if (form.remark !== undefined) data.remark = form.remark

      const updated = await updateOrder(Number(id), data)
      setOrder(updated)
      setSuccess('保存成功')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(typeof msg === 'string' ? msg : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyAddress = async () => {
    if (!order) return
    const text = `${order.community} ${order.address}`
    const ok = await copyText(text)
    if (ok) { setSuccess('地址已复制'); setCopyNotice('') }
    else { setCopyNotice(`地址: ${text}（请长按复制）`) }
  }

  const handleCopyWarrantyLink = async () => {
    if (!order?.warranty_token) return
    const url = buildWarrantyUrl(order.warranty_token)
    const ok = await copyText(url)
    if (ok) { setSuccess('保修链接已复制'); setCopyNotice('') }
    else { setCopyNotice(`保修链接: ${url}（请长按复制）`) }
  }

  const handleOpenWarranty = () => {
    if (!order?.warranty_token) return
    window.open(buildWarrantyUrl(order.warranty_token), '_blank')
  }

  if (loading || authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">加载中...</p></div>
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || '订单不存在'}</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    )
  }

  const isCompleted = order.status === '已完成'
  const hasWarrantyToken = !!order.warranty_token

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="p-4">
        {/* 头部 */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="text-blue-600 min-h-[44px] min-w-[44px] flex items-center">← 返回</button>
          <h1 className="text-lg font-bold flex-1">订单详情</h1>
        </div>

        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
        {success && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">{success}</div>}
        {copyNotice && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm break-all">
            自动复制失败，请长按下面文本手动复制：<br /><span className="font-mono">{copyNotice}</span>
          </div>
        )}

        {/* 工单信息 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold">{order.order_no}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-xs text-gray-400">创建: {order.created_at.replace('T', ' ').slice(0, 19)}</div>
        </div>

        {/* 客户信息 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h3 className="font-bold mb-2">客户信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">姓名/称呼</span><span>{order.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">电话</span><a href={`tel:${order.phone}`} className="text-blue-600">{order.phone}</a></div>
            <div className="flex justify-between"><span className="text-gray-500">小区</span><span>{order.community}</span></div>
            <div className="flex justify-between items-start"><span className="text-gray-500">地址</span><span className="text-right max-w-[60%]">{order.address}</span></div>
          </div>
          <div className="flex gap-2 mt-3">
            <a href={`tel:${order.phone}`} className="flex-1 min-h-[44px] flex items-center justify-center bg-green-50 text-green-700 rounded-lg text-sm font-medium">📞 拨打</a>
            <button onClick={handleCopyAddress} className="flex-1 min-h-[44px] flex items-center justify-center bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">📋 复制地址</button>
          </div>
        </div>

        {/* 家电信息 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h3 className="font-bold mb-2">家电信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">服务类型</span><span>{order.service_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">类型</span><span>{order.appliance_type}</span></div>
            {order.brand_model && <div className="flex justify-between"><span className="text-gray-500">品牌型号</span><span>{order.brand_model}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">故障</span><span className="text-right max-w-[60%]">{order.fault_description}</span></div>
            {order.preferred_time && <div className="flex justify-between"><span className="text-gray-500">希望上门</span><span>{order.preferred_time}</span></div>}
            {order.is_urgent && <div className="text-red-600 text-sm font-medium">⚠ 紧急</div>}
          </div>
        </div>

        {/* 客户上传图片 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h3 className="font-bold mb-2">客户上传图片</h3>
          {(() => {
            const images = parseImagePaths(order.image_paths)
            return images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {images.map((path) => (
                  <button key={path} type="button" onClick={() => setPreviewImages(images)} className="p-0 border-0 bg-transparent">
                    <img src={path} alt="客户上传" className="h-24 w-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">暂无客户上传图片</p>
            )
          })()}
        </div>

        {canEditOrder ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="font-bold mb-3">维修记录</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">订单状态</label>
                <select value={form.status || ''} onChange={(e) => update('status', e.target.value)} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">回访状态</label>
                <select value={form.followup_status || ''} onChange={(e) => update('followup_status', e.target.value)} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {FOLLOWUP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div ref={(el) => { fieldRefs.current.scheduled_at = el }}>
                <label className="text-sm text-gray-500 mb-1 block">预约上门时间</label>
                <input type="datetime-local" value={form.scheduled_at || ''} min={getCurrentDateTimeLocalString()}
                  onChange={(e) => update('scheduled_at', e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                {dateErrors.scheduled_at && <p className="text-red-600 text-sm mt-1">{dateErrors.scheduled_at}</p>}
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">维修结果</label>
                <textarea value={form.repair_result || ''} onChange={(e) => update('repair_result', e.target.value)} rows={2} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">更换配件</label>
                <input type="text" value={form.parts_used || ''} onChange={(e) => update('parts_used', e.target.value)} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">收费金额（元）</label>
                <input type="number" min="0" value={form.final_fee ?? ''} onChange={(e) => update('final_fee', e.target.value ? Number(e.target.value) : undefined)} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div ref={(el) => { fieldRefs.current.warranty_until = el }}>
                <label className="text-sm text-gray-500 mb-1 block">保修截止日期</label>
                <input type="date" value={form.warranty_until || ''} min={getTodayDateString()}
                  onChange={(e) => update('warranty_until', e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                {dateErrors.warranty_until && <p className="text-red-600 text-sm mt-1">{dateErrors.warranty_until}</p>}
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">保修说明</label>
                <input type="text" value={form.warranty_note || ''} onChange={(e) => update('warranty_note', e.target.value)} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">备注</label>
                <textarea value={form.remark || ''} onChange={(e) => update('remark', e.target.value)} rows={2} className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
              </div>
            </div>

            <Button fullWidth onClick={handleSave} disabled={saving || Object.keys(dateErrors).length > 0} className="mt-4">
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="font-bold mb-3">维修记录</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">订单状态</span><span>{order.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">回访状态</span><span>{order.followup_status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">预约时间</span><span>{order.scheduled_at?.replace('T', ' ').slice(0, 16) || '-'}</span></div>
              <div className="flex justify-between items-start"><span className="text-gray-500">维修结果</span><span className="max-w-[60%] text-right">{order.repair_result || '-'}</span></div>
              <div className="flex justify-between items-start"><span className="text-gray-500">更换配件</span><span className="max-w-[60%] text-right">{order.parts_used || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">收费金额</span><span>{order.final_fee != null ? `¥${order.final_fee}` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">保修截止</span><span>{order.warranty_until || '-'}</span></div>
              <div className="flex justify-between items-start"><span className="text-gray-500">保修说明</span><span className="max-w-[60%] text-right">{order.warranty_note || '-'}</span></div>
              <div className="flex justify-between items-start"><span className="text-gray-500">备注</span><span className="max-w-[60%] text-right">{order.remark || '-'}</span></div>
            </div>
          </div>
        )}

        {/* 保修凭证 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h3 className="font-bold mb-2">保修凭证</h3>
          {isCompleted && hasWarrantyToken ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">保修链接已生成，可分享给客户：</p>
              <p className="text-xs text-blue-600 break-all mb-3">{buildWarrantyUrl(order.warranty_token!)}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleOpenWarranty}>打开保修页</Button>
                <Button variant="secondary" fullWidth onClick={handleCopyWarrantyLink}>📋 复制保修链接</Button>
              </div>
            </div>
          ) : isCompleted && !order.warranty_until ? (
            <p className="text-sm text-gray-400">请设置保修截止日期后生成保修链接</p>
          ) : !isCompleted ? (
            <p className="text-sm text-gray-400">订单完成并设置保修截止日期后生成保修链接</p>
          ) : (
            <p className="text-sm text-gray-400">保存保修信息后生成保修链接</p>
          )}
        </div>
      </div>

      <ImagePreviewModal
        images={previewImages}
        alt="客户上传图片"
        onClose={() => setPreviewImages([])}
      />
    </div>
  )
}
