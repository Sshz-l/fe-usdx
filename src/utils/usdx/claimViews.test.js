const test = require('node:test')
const assert = require('node:assert/strict')

const { getClaimSummary } = require('./claimViews')

test('claim page is empty when lock and claimable are both zero', () => {
  const s = getClaimSummary({ claimable: 0n, remainingLock: 0n })
  assert.equal(s.hasPlan, false)
  assert.equal(s.canClaim, false)
  assert.equal(s.daily, 0)
})

test('claim daily comes from aggregated position daily, not remainingLock * 0.3%', () => {
  const lock = getClaimSummary({
    claimable: 0n,
    remainingLock: 80n * 10n ** 18n,
    daily: 1n * 10n ** 18n,
  })
  assert.equal(lock.hasPlan, true)
  assert.equal(lock.canClaim, false)
  assert.equal(lock.daily, 1)
  assert.notEqual(lock.daily, 0.24)
})

test('canClaim follows wei: sub-cent claimable is claimable on chain', () => {
  const wei = 2880000000000000n // 0.00288 USDX
  const s = getClaimSummary({
    claimable: wei,
    remainingLock: 80n * 10n ** 17n,
    daily: wei,
  })
  assert.equal(s.canClaim, true)
  assert.equal(s.claimableWei, wei)
})

test('claim success toast matches HTML copy', () => {
  const { formatClaimSuccessMessage } = require('./claimViews')
  assert.equal(formatClaimSuccessMessage(3240n * 10n ** 18n), 'Claimed 3,240 USDX')
  assert.equal(formatClaimSuccessMessage(17n * 10n ** 16n), 'Claimed 0.17 USDX')
})
