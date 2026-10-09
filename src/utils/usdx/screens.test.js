const test = require('node:test')
const assert = require('node:assert/strict')

const {
  USDX_PRIMARY_SCREENS,
  USDX_SCREENS,
  isUsdxPrimaryScreen,
  parseUsdxHash,
  parseUsdxRoute,
  toUsdxHash,
  getUsdxBackScreen,
  shouldRefreshUsdxWalletOnScreen,
} = require('./screens')

test('usdx screens do not include unlock', () => {
  assert.equal(USDX_SCREENS.includes('s-unlock'), false)
  assert.equal(USDX_SCREENS.includes('s-home'), false)
  assert.equal(USDX_SCREENS.includes('s-protocol'), false)
  assert.deepEqual(USDX_PRIMARY_SCREENS, ['s-mint', 's-swap', 's-redeem', 's-mine'])
})

test('parseUsdxHash maps known routes and falls back to mint', () => {
  assert.equal(parseUsdxHash('#/mint'), 's-mint')
  assert.equal(parseUsdxHash('#/home'), 's-mint')
  assert.equal(parseUsdxHash('#/protocol'), 's-mint')
  assert.equal(parseUsdxHash('#/unlock'), 's-mint')
  assert.equal(parseUsdxHash(''), 's-mint')
  assert.equal(isUsdxPrimaryScreen('s-mint'), true)
  assert.equal(isUsdxPrimaryScreen('s-redeem'), true)
  assert.equal(isUsdxPrimaryScreen('s-claim'), false)
})

test('toUsdxHash writes product hashes', () => {
  assert.equal(toUsdxHash('s-mint'), '#/mint')
  assert.equal(toUsdxHash('s-redeem'), '#/redeem')
  assert.equal(toUsdxHash('s-plan', { planMintId: 42n }), '#/plan/42')
})

test('parseUsdxRoute restores plan mint id from hash for refresh', () => {
  assert.deepEqual(parseUsdxRoute('#/plan/7'), {
    screen: 's-plan',
    planMintId: 7n,
    swapDetailKey: null,
    swapDetailBack: null,
  })
  assert.deepEqual(parseUsdxRoute('#/plan'), {
    screen: 's-plan',
    planMintId: null,
    swapDetailKey: null,
    swapDetailBack: null,
  })
  assert.equal(parseUsdxHash('#/plan/3'), 's-plan')
})

test('swap detail hash round-trips activity fields for refresh', () => {
  const key = {
    kind: 5,
    mintId: 8n,
    ts: 1787723498n,
    a0: 10n ** 16n,
    a1: 0n,
  }
  const hash = toUsdxHash('s-swap-detail', { swapDetailKey: key, swapDetailBack: 's-activity' })
  assert.equal(hash, '#/swap-detail/5/8/1787723498/10000000000000000/0/activity')
  assert.deepEqual(parseUsdxRoute(hash), {
    screen: 's-swap-detail',
    planMintId: null,
    swapDetailKey: key,
    swapDetailBack: 's-activity',
  })
})

test('swap detail route rejects incomplete hashes', () => {
  assert.deepEqual(parseUsdxRoute('#/swap-detail'), {
    screen: 's-swap-detail',
    planMintId: null,
    swapDetailKey: null,
    swapDetailBack: null,
  })
  assert.equal(parseUsdxRoute('#/swap-detail/4/0/1/2').swapDetailKey, null)
})

test('getUsdxBackScreen defaults to mine after home removal', () => {
  assert.equal(getUsdxBackScreen('s-claim'), 's-mine')
  assert.equal(getUsdxBackScreen('s-activity'), 's-mine')
  assert.equal(getUsdxBackScreen('s-swap-detail'), 's-mine')
  assert.equal(getUsdxBackScreen('s-plan'), 's-claim')
  assert.equal(getUsdxBackScreen('s-unknown'), 's-mine')
})

test('activity navigation keeps the source screen', () => {
  const { getActivityNavigation } = require('./screens')
  assert.deepEqual(getActivityNavigation(4, 's-mine'), {
    type: 'sheet',
    sheet: 'swap-detail',
    back: 's-mine',
  })
  assert.deepEqual(getActivityNavigation(5, 's-activity'), {
    type: 'screen',
    screen: 's-swap-detail',
    back: 's-mine',
  })
  assert.equal(getActivityNavigation(0, 's-activity').screen, 's-plan')
  assert.equal(getActivityNavigation(1, 's-mine').type, 'none')
  assert.equal(getActivityNavigation(2, 's-activity').type, 'none')
})

test('swap, redeem and mine refresh on-chain USDX wallet; mint does not', () => {
  assert.equal(shouldRefreshUsdxWalletOnScreen('s-swap'), true)
  assert.equal(shouldRefreshUsdxWalletOnScreen('s-redeem'), true)
  assert.equal(shouldRefreshUsdxWalletOnScreen('s-mine'), true)
  assert.equal(shouldRefreshUsdxWalletOnScreen('s-mint'), false)
  assert.equal(shouldRefreshUsdxWalletOnScreen('s-activity'), false)
})
