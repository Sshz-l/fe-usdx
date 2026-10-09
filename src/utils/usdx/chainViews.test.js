const test = require('node:test')
const assert = require('node:assert/strict')

const { dToUsdtIn, getMintQuoteDisplay } = require('./chainViews')

test('dToUsdtIn converts total deposit D to half usdt wei', () => {
  assert.equal(dToUsdtIn('100'), 50n * 10n ** 18n)
  assert.equal(dToUsdtIn(''), 0n)
})

test('getMintQuoteDisplay maps chain quoteMint view', () => {
  const quote = {
    boxIn: 10n ** 18n,
    depositD: 2n * 10n ** 18n,
    immediate: 8n * 10n ** 17n,
    lockL0: 16n * 10n ** 17n,
    daily: 48n * 10n ** 15n,
    mintable: true,
  }
  const d = getMintQuoteDisplay(quote)
  assert.equal(d.mintable, true)
  assert.equal(d.immediate, quote.immediate)
  assert.equal(d.M, quote.immediate + quote.lockL0)
  assert.equal(d.R, quote.daily)
})

test('isMintQuoteAmountSynced compares usdtIn wei', () => {
  const { isMintQuoteAmountSynced } = require('./chainViews')
  const half = 50n * 10n ** 18n
  assert.equal(isMintQuoteAmountSynced(half, half), true)
  assert.equal(isMintQuoteAmountSynced(half, half + 1n), false)
  assert.equal(isMintQuoteAmountSynced(0n, half), false)
})
