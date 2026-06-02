import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canAssignOrders,
  canEditOrder,
  canExportOrders,
  canManageSystemUsers,
  canManageUsedAppliances,
  canWriteOrders,
} from '../src/utils/permissions.ts'
import type { Order } from '../src/types/order.ts'
import type { User } from '../src/types/user.ts'

const baseOrder: Order = {
  id: 1,
  order_no: 'WX20260602001',
  customer_name: '李师傅',
  phone: '13100020001',
  community: '阳光小区',
  address: '3号楼2单元501',
  service_type: '维修',
  appliance_type: '空调',
  brand_model: null,
  fault_description: '测试故障',
  preferred_time: null,
  scheduled_at: null,
  is_urgent: false,
  image_paths: null,
  status: '新报修',
  followup_status: '未回访',
  repair_result: null,
  parts_used: null,
  final_fee: null,
  remark: null,
  repair_images: null,
  warranty_until: null,
  warranty_token: null,
  warranty_note: null,
  source: '扫码报修',
  completed_at: null,
  created_at: '2026-06-02T10:00:00',
  updated_at: '2026-06-02T10:00:00',
  latitude: null,
  longitude: null,
  location_address: null,
  assigned_user_id: null,
  assigned_username: null,
}

const adminUser: User = {
  id: 1,
  username: 'admin',
  role: 'admin',
  is_active: true,
  created_at: '2026-06-02T10:00:00',
  last_login_at: null,
}

const staffUser: User = {
  id: 2,
  username: 'staff01',
  role: 'staff',
  is_active: true,
  created_at: '2026-06-02T10:00:00',
  last_login_at: null,
}

const viewerUser: User = {
  id: 3,
  username: 'viewer01',
  role: 'viewer',
  is_active: true,
  created_at: '2026-06-02T10:00:00',
  last_login_at: null,
}

test('admin can use every privileged action', () => {
  assert.equal(canWriteOrders('admin'), true)
  assert.equal(canAssignOrders('admin'), true)
  assert.equal(canExportOrders('admin'), true)
  assert.equal(canManageUsedAppliances('admin'), true)
  assert.equal(canManageSystemUsers('admin'), true)
})

test('staff can write orders but cannot manage owner-only areas', () => {
  assert.equal(canWriteOrders('staff'), true)
  assert.equal(canAssignOrders('staff'), false)
  assert.equal(canExportOrders('staff'), false)
  assert.equal(canManageUsedAppliances('staff'), false)
  assert.equal(canManageSystemUsers('staff'), false)
})

test('viewer can only read backend data', () => {
  assert.equal(canWriteOrders('viewer'), false)
  assert.equal(canAssignOrders('viewer'), false)
  assert.equal(canExportOrders('viewer'), false)
  assert.equal(canManageUsedAppliances('viewer'), false)
  assert.equal(canManageSystemUsers('viewer'), false)
})

test('missing role has no privileged access', () => {
  assert.equal(canWriteOrders(undefined), false)
  assert.equal(canAssignOrders(undefined), false)
  assert.equal(canExportOrders(undefined), false)
  assert.equal(canManageUsedAppliances(undefined), false)
  assert.equal(canManageSystemUsers(undefined), false)
})

test('order edit permission depends on user and assignee', () => {
  assert.equal(canEditOrder(adminUser, { ...baseOrder, assigned_user_id: 99 }), true)
  assert.equal(canEditOrder(staffUser, { ...baseOrder, assigned_user_id: staffUser.id }), true)
  assert.equal(canEditOrder(staffUser, { ...baseOrder, assigned_user_id: null }), true)
  assert.equal(canEditOrder(staffUser, { ...baseOrder, assigned_user_id: 99 }), false)
  assert.equal(canEditOrder(viewerUser, { ...baseOrder, assigned_user_id: null }), false)
  assert.equal(canEditOrder(null, { ...baseOrder, assigned_user_id: null }), false)
})
