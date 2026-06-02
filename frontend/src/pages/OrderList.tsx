import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import StatusBadge from '../components/StatusBadge'
import { getOrders, exportOrders } from '../api/orders'
import { useAuth } from '../hooks/useAuth'
import { ORDER_STATUSES, FOLLOWUP_STATUSES, SERVICE_TYPES } from '../utils/constants'
import { canExportOrders } from '../utils/permissions'
import type { Order } from '../types/order'

export default function OrderList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const canExport = canExportOrders(user?.role)

  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const statusFilter = searchParams.get('status') || ''
  const followupFilter = searchParams.get('followup_status') || ''
  const serviceTypeFilter = searchParams.get('service_type') || ''
  const keyword = searchParams.get('keyword') || ''
  const createdDateStart = searchParams.get('created_date_start') || ''

  // Local keyword state for IME-friendly search (debounced sync to URL)
  const [localKeyword, setLocalKeyword] = useState(keyword)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isComposingRef = useRef(false)

  const handleKeywordChange = useCallback((value: string) => {
    setLocalKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (value) next.set('keyword', value)
      else next.delete('keyword')
      setSearchParams(next)
    }, 300)
  }, [searchParams, setSearchParams])
  const createdDateEnd = searchParams.get('created_date_end') || ''
  const scheduledDateStart = searchParams.get('scheduled_date_start') || ''
  const scheduledDateEnd = searchParams.get('scheduled_date_end') || ''

  useEffect(() => {
    let cancelled = false

    void getOrders({
      status: statusFilter || undefined,
      followup_status: followupFilter || undefined,
      service_type: serviceTypeFilter === '维修' || serviceTypeFilter === '清洗' ? serviceTypeFilter : undefined,
      keyword: keyword || undefined,
      created_date_start: createdDateStart || undefined,
      created_date_end: createdDateEnd || undefined,
      scheduled_date_start: scheduledDateStart || undefined,
      scheduled_date_end: scheduledDateEnd || undefined,
      page: 1,
      page_size: 20,
    })
      .then((res) => {
        if (cancelled) return
        setOrders(res.items)
        setTotal(res.total)
        setHasMore(res.has_more)
        setPage(1)
        setError('')
      })
      .catch(() => {
        if (cancelled) return
        setError('订单列表加载失败')
        setHasMore(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [statusFilter, followupFilter, serviceTypeFilter, keyword, createdDateStart, createdDateEnd, scheduledDateStart, scheduledDateEnd])

  const loadMore = async () => {
    setLoading(true)
    try {
      const res = await getOrders({
        status: statusFilter || undefined,
        followup_status: followupFilter || undefined,
        service_type: serviceTypeFilter === '维修' || serviceTypeFilter === '清洗' ? serviceTypeFilter : undefined,
        keyword: keyword || undefined,
        created_date_start: createdDateStart || undefined,
        created_date_end: createdDateEnd || undefined,
        scheduled_date_start: scheduledDateStart || undefined,
        scheduled_date_end: scheduledDateEnd || undefined,
        page: page + 1,
        page_size: 20,
      })
      setOrders((prev) => [...prev, ...res.items])
      setTotal(res.total)
      setHasMore(res.has_more)
      setPage(page + 1)
      setError('')
    } catch {
      setError('订单列表加载失败')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const updateParam = (key: string, value: string) => {
    setLoading(true)
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportOrders({
        status: statusFilter || undefined,
        followup_status: followupFilter || undefined,
        service_type: serviceTypeFilter === '维修' || serviceTypeFilter === '清洗' ? serviceTypeFilter : undefined,
        keyword: keyword || undefined,
        created_date_start: createdDateStart || undefined,
        created_date_end: createdDateEnd || undefined,
        scheduled_date_start: scheduledDateStart || undefined,
        scheduled_date_end: scheduledDateEnd || undefined,
      })
      const now = new Date()
      const filename = `orders_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.xlsx`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-lg font-bold mb-3">订单列表</h1>

        {/* 筛选 */}
        <div className="flex flex-col gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全部状态</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={followupFilter}
            onChange={(e) => updateParam('followup_status', e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全部回访状态</option>
            {FOLLOWUP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={serviceTypeFilter}
            onChange={(e) => updateParam('service_type', e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全部服务类型</option>
            {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="text"
            placeholder="搜索工单号/姓名/手机/小区..."
            value={localKeyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false
              const value = (e.target as HTMLInputElement).value
              setLocalKeyword(value)
              if (debounceRef.current) clearTimeout(debounceRef.current)
              const next = new URLSearchParams(searchParams)
              if (value) next.set('keyword', value)
              else next.delete('keyword')
              setSearchParams(next)
            }}
            className="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />

          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 w-14 shrink-0">创建日期</span>
              <input
                type="date"
                value={createdDateStart}
                onChange={(e) => updateParam('created_date_start', e.target.value)}
                className="flex-1 min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="开始"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={createdDateEnd}
                onChange={(e) => updateParam('created_date_end', e.target.value)}
                className="flex-1 min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="结束"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 w-14 shrink-0">预约日期</span>
              <input
                type="date"
                value={scheduledDateStart}
                onChange={(e) => updateParam('scheduled_date_start', e.target.value)}
                className="flex-1 min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="开始"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={scheduledDateEnd}
                onChange={(e) => updateParam('scheduled_date_end', e.target.value)}
                className="flex-1 min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="结束"
              />
            </div>
          </div>
        </div>

        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">共 {total} 条</span>
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {exporting ? '导出中...' : '导出 Excel'}
            </button>
          )}
        </div>

        {/* 列表 */}
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{order.order_no}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="font-medium">{order.customer_name}</div>
              <div className="text-sm text-gray-600">
                {order.service_type} · {order.appliance_type}{order.brand_model ? ` · ${order.brand_model}` : ''}
              </div>
              <div className="text-sm text-gray-500 truncate">{order.fault_description}</div>
              <div className="text-xs text-gray-400 mt-1">
                {order.scheduled_at
                  ? `预约: ${order.scheduled_at.replace('T', ' ').slice(0, 16)}`
                  : order.preferred_time
                  ? `希望: ${order.preferred_time}`
                  : ''}
              </div>
              {order.is_urgent && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">紧急</span>
              )}
              <div className="flex gap-2 mt-3">
                <a
                  href={`tel:${order.phone}`}
                  className="flex-1 min-h-[44px] flex items-center justify-center bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                >
                  📞 拨打
                </a>
                <button
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="flex-1 min-h-[44px] flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}

          {orders.length === 0 && !loading && (
            <p className="text-gray-400 text-center py-8">暂无订单</p>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => {
              void loadMore()
            }}
            disabled={loading}
            className="w-full min-h-[44px] mt-4 text-blue-600 text-sm"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
