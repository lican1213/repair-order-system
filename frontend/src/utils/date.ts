/** 返回本地日期 YYYY-MM-DD（不受 UTC 时区影响） */
export function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 返回本地当前时间 YYYY-MM-DDTHH:mm（用于 datetime-local min） */
export function getCurrentDateTimeLocalString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

/** 判断 YYYY-MM-DD 是否早于今天 */
export function isPastDate(dateString: string): boolean {
  if (!dateString) return false
  return dateString < getTodayDateString()
}

/** 判断 YYYY-MM-DDTHH:mm 是否早于当前时刻 */
export function isPastDateTime(dateTimeString: string): boolean {
  if (!dateTimeString) return false
  return dateTimeString < getCurrentDateTimeLocalString()
}

/** 判断客户选择的日期 + 时间段是否已经过去 */
export function isPastPreferredSlot(dateString: string, slot: string): boolean {
  if (!dateString || !slot) return false
  // 只在日期是今天时判断时间段
  if (dateString !== getTodayDateString()) return false
  const now = new Date()
  const hour = now.getHours()
  if (slot.startsWith('上午') && hour >= 12) return true
  if (slot.startsWith('下午') && hour >= 18) return true
  if (slot.startsWith('晚上') && hour >= 21) return true
  if (slot.startsWith('都可以') && hour >= 21) return true
  return false
}

/** 获取今天时间段的提示信息（如果今天所有时间段都已过去） */
export function getTodaySlotHint(dateString: string): string | null {
  if (dateString !== getTodayDateString()) return null
  const hour = new Date().getHours()
  if (hour >= 21) return '今天已无可预约时间段，请选择明天或之后日期'
  return null
}

/** 校验保修截止日期 */
export function validateWarrantyDate(warrantyUntil: string, completedAt?: string | null): string | null {
  if (!warrantyUntil) return null
  if (isPastDate(warrantyUntil)) return '不能选择过去日期'
  if (completedAt) {
    const completedDate = completedAt.slice(0, 10)
    if (warrantyUntil < completedDate) return '保修截止日期不能早于维修完成日期'
  }
  return null
}

/** 从 datetime 字符串提取 YYYY-MM-DD 部分 */
export function toDateInputValue(value?: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}
