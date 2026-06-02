import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canExportOrders,
  canManageSystemUsers,
  canManageUsedAppliances,
  canWriteOrders,
} from '../src/utils/permissions.ts'

test('admin can use every privileged action', () => {
  assert.equal(canWriteOrders('admin'), true)
  assert.equal(canExportOrders('admin'), true)
  assert.equal(canManageUsedAppliances('admin'), true)
  assert.equal(canManageSystemUsers('admin'), true)
})

test('staff can write orders but cannot manage owner-only areas', () => {
  assert.equal(canWriteOrders('staff'), true)
  assert.equal(canExportOrders('staff'), false)
  assert.equal(canManageUsedAppliances('staff'), false)
  assert.equal(canManageSystemUsers('staff'), false)
})

test('viewer can only read backend data', () => {
  assert.equal(canWriteOrders('viewer'), false)
  assert.equal(canExportOrders('viewer'), false)
  assert.equal(canManageUsedAppliances('viewer'), false)
  assert.equal(canManageSystemUsers('viewer'), false)
})

test('missing role has no privileged access', () => {
  assert.equal(canWriteOrders(undefined), false)
  assert.equal(canExportOrders(undefined), false)
  assert.equal(canManageUsedAppliances(undefined), false)
  assert.equal(canManageSystemUsers(undefined), false)
})
