import { useState } from 'react'
import type { Order, OrderStatus, OrderUpdateRequest } from '../types/order'
import type { User } from '../types/user'
import { updateOrder } from '../api/orders'
import { canEditOrder } from '../utils/permissions'
import {
  addHoursDateTimeLocal,
  getCurrentDateTimeLocalString,
  getTodayDateString,
  isPastDate,
  isPastDateTime,
  presetDateTimeLocal,
} from '../utils/date'
import Button from './Button'
import BottomSheet from './BottomSheet'

interface OrderQuickActionsProps {
  order: Order
  user: Pick<User, 'id' | 'role'> | null | undefined
  onUpdated: (order: Order) => void
  layout?: 'card' | 'bar'
}

type SheetType = 'schedule' | 'complete' | null

const NEXT_ACTIONS: Record<OrderStatus, OrderStatus[]> = {
  新报修: ['已联系', '已预约', '已完成'],
  已联系: ['已预约', '已完成'],
  已预约: ['已完成'],
  已上门: ['已完成'],
  已完成: [],
  需复查: [],
  未成交: [],
}

export default function OrderQuickActions({
  order,
  user,
  onUpdated,
  layout = 'card',
}: OrderQuickActionsProps) {
  const canEdit = canEditOrder(user, order)
  const [sheetType, setSheetType] = useState<SheetType>(null)
  const [submittingAction, setSubmittingAction] = useState<OrderStatus | null>(null)
  const [error, setError] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [finalFee, setFinalFee] = useState('')
  const [repairResult, setRepairResult] = useState('')
  const [warrantyUntil, setWarrantyUntil] = useState('')

  const actions = NEXT_ACTIONS[order.status]
  const schedulePresets = [
    { label: '今天下午', value: presetDateTimeLocal(0, 14) },
    { label: '明天上午', value: presetDateTimeLocal(1, 9) },
    { label: '+2小时', value: addHoursDateTimeLocal(2) },
  ]

  if (!canEdit || actions.length === 0) return null

  const wrapperClass = layout === 'bar'
    ? 'bg-white rounded-lg border border-gray-200 p-4 mb-4'
    : 'mt-3 border-t border-gray-100 pt-3'
  const buttonClass = layout === 'bar'
    ? 'flex-1 min-w-[96px]'
    : 'min-w-[88px]'

  const submitPatch = async (status: OrderStatus, extra: Omit<OrderUpdateRequest, 'status'> = {}) => {
    setSubmittingAction(status)
    setError('')
    try {
      const updated = await updateOrder(order.id, { status, ...extra })
      onUpdated(updated)
      setSheetType(null)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(typeof detail === 'string' ? detail : '操作失败，请稍后重试')
    } finally {
      setSubmittingAction(null)
    }
  }

  const openScheduleSheet = () => {
    setError('')
    setScheduleAt(order.scheduled_at?.slice(0, 16) || addHoursDateTimeLocal(2))
    setSheetType('schedule')
  }

  const openCompleteSheet = () => {
    setError('')
    setFinalFee(order.final_fee != null ? String(order.final_fee) : '')
    setRepairResult(order.repair_result || '')
    setWarrantyUntil(order.warranty_until || '')
    setSheetType('complete')
  }

  const handleCompleteSubmit = async () => {
    const feeValue = finalFee.trim()
    if (!feeValue) {
      setError('请填写收费金额')
      return
    }
    const parsedFee = Number(feeValue)
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      setError('收费金额格式不正确')
      return
    }
    if (warrantyUntil && isPastDate(warrantyUntil)) {
      setError('保修截止日期不能选择过去日期')
      return
    }

    await submitPatch('已完成', {
      final_fee: parsedFee,
      repair_result: repairResult.trim() || undefined,
      warranty_until: warrantyUntil || undefined,
    })
  }

  const handleScheduleSubmit = async () => {
    if (!scheduleAt) {
      setError('请填写预约上门时间')
      return
    }
    if (isPastDateTime(scheduleAt)) {
      setError('预约时间不能早于当前时间')
      return
    }

    await submitPatch('已预约', { scheduled_at: scheduleAt })
  }

  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap gap-2">
        {actions.includes('已联系') && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => { void submitPatch('已联系') }}
            disabled={submittingAction !== null}
            className={buttonClass}
          >
            {submittingAction === '已联系' ? '处理中...' : '标记已联系'}
          </Button>
        )}

        {actions.includes('已预约') && (
          <Button
            type="button"
            variant="secondary"
            onClick={openScheduleSheet}
            disabled={submittingAction !== null}
            className={buttonClass}
          >
            预约上门
          </Button>
        )}

        {actions.includes('已完成') && (
          <Button
            type="button"
            onClick={openCompleteSheet}
            disabled={submittingAction !== null}
            className={buttonClass}
          >
            ✓ 标记完成
          </Button>
        )}
      </div>

      {error && sheetType === null && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <BottomSheet
        open={sheetType === 'schedule'}
        title="安排上门时间"
        onClose={() => {
          setSheetType(null)
          setError('')
        }}
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {schedulePresets.map((preset) => {
              const disabled = isPastDateTime(preset.value)
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => setScheduleAt(preset.value)}
                  className={`min-h-[40px] rounded-full px-3 text-sm ${
                    scheduleAt === preset.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">预约上门时间</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              min={getCurrentDateTimeLocalString()}
              onChange={(event) => setScheduleAt(event.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            fullWidth
            onClick={() => { void handleScheduleSubmit() }}
            disabled={submittingAction !== null}
          >
            {submittingAction === '已预约' ? '保存中...' : '保存预约'}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheetType === 'complete'}
        title="完成订单"
        onClose={() => {
          setSheetType(null)
          setError('')
        }}
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm text-gray-600">收费金额（元）</label>
            <input
              autoFocus
              type="number"
              min="0"
              inputMode="decimal"
              value={finalFee}
              onChange={(event) => setFinalFee(event.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">维修结果（可选）</label>
            <textarea
              rows={3}
              value={repairResult}
              onChange={(event) => setRepairResult(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">保修截止（可选）</label>
            <input
              type="date"
              value={warrantyUntil}
              min={getTodayDateString()}
              onChange={(event) => setWarrantyUntil(event.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            fullWidth
            onClick={() => { void handleCompleteSubmit() }}
            disabled={submittingAction !== null}
          >
            {submittingAction === '已完成' ? '保存中...' : '确认完成'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
