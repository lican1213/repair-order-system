import assert from 'node:assert/strict'
import test from 'node:test'

import { getFaultDescriptionCopy, getNewOrderAlertTitle } from '../src/utils/orderCopy.ts'

test('uses repair copy for repair service type', () => {
  const copy = getFaultDescriptionCopy('维修')

  assert.equal(copy.label, '故障描述 *')
  assert.equal(copy.error, '请描述故障')
})

test('uses cleaning copy for cleaning service type', () => {
  const copy = getFaultDescriptionCopy('清洗')

  assert.equal(copy.label, '清洗需求 *')
  assert.equal(copy.error, '请描述清洗需求')
})

test('formats new order alert title with count', () => {
  assert.equal(getNewOrderAlertTitle(3), '有 3 个新订单')
})
