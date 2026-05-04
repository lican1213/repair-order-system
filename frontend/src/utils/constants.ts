import type { OrderStatus, FollowupStatus } from '../types/order'

export const ORDER_STATUSES: OrderStatus[] = [
  '新报修',
  '已联系',
  '已预约',
  '已上门',
  '已完成',
  '需复查',
  '未成交',
]

export const FOLLOWUP_STATUSES: FollowupStatus[] = [
  '未回访',
  '已回访',
  '客户有问题',
  '无需回访',
]

export const APPLIANCE_TYPES = [
  '空调',
  '冰箱',
  '洗衣机',
  '热水器',
  '燃气灶',
  '电视',
  '微波炉',
  '油烟机',
  '其他',
]

export const USED_APPLIANCE_CATEGORIES = [
  '空调',
  '冰箱',
  '洗衣机',
  '热水器',
  '电视',
  '其他',
]

export const USED_APPLIANCE_STATUSES = ['在售', '已售', '下架'] as const

export const STATUS_COLORS: Record<OrderStatus, string> = {
  '新报修': 'bg-red-100 text-red-700',
  '已联系': 'bg-blue-100 text-blue-700',
  '已预约': 'bg-orange-100 text-orange-700',
  '已上门': 'bg-purple-100 text-purple-700',
  '已完成': 'bg-green-100 text-green-700',
  '需复查': 'bg-yellow-100 text-yellow-700',
  '未成交': 'bg-gray-100 text-gray-700',
}
