import assert from 'node:assert/strict'
import test from 'node:test'

import { canUseNativeShare } from '../src/utils/shareSupport.ts'

const share = async () => {}
const data = {
  title: '二手洗衣机',
  text: '二手洗衣机 | 洗衣机 | 电话咨询',
  url: 'https://example.com/used/1',
}

test('uses native share on mobile when supported', () => {
  const nav = {
    share,
    canShare: () => true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    maxTouchPoints: 5,
  }

  assert.equal(canUseNativeShare(data, nav), true)
})

test('does not use native share on desktop even when the API exists', () => {
  const nav = {
    share,
    canShare: () => true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
    maxTouchPoints: 0,
  }

  assert.equal(canUseNativeShare(data, nav), false)
})

test('does not use native share when payload is unsupported', () => {
  const nav = {
    share,
    canShare: () => false,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/123.0.0.0 Mobile Safari/537.36',
    maxTouchPoints: 5,
  }

  assert.equal(canUseNativeShare(data, nav), false)
})
