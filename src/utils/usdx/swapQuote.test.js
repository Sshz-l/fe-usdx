const test = require('node:test')
const assert = require('node:assert/strict')

const { formatSwapFeeLabel, formatSwapBuySuccessMessage, getSwapPayLimitMessage, quoteSwapPreview } = require('./swapQuote')

test('buy USDT to USDX is 1:1 and free', () => {
  const q = quoteSwapPreview('U2X', '100', 1000n * 10n ** 18n)
  assert.equal(q.pay, 'USDT')
  assert.equal(q.recv, 'USDX')
  assert.equal(q.got, 100n * 10n ** 18n)
  assert.equal(q.feeLabel, 'Free')
  assert.equal(q.cta, 'Swap')
  assert.equal(q.isSell, false)
  assert.equal(q.canSubmit, true)
})

test('sell USDX to USDT queues with 0.1%-0.5% fee range label', () => {
  const q = quoteSwapPreview('X2U', '100', 100n * 10n ** 18n)
  assert.equal(q.pay, 'USDX')
  assert.equal(q.recv, 'USDT')
  assert.equal(q.got, 999n * 10n ** 17n)
  assert.equal(q.feeLabel, '0.1%-0.5%')
  assert.equal(q.cta, 'Submit order')
  assert.equal(q.isSell, true)
})

test('buy success toast matches HTML copy', () => {
  assert.equal(formatSwapBuySuccessMessage(3n * 10n ** 18n), 'Swap successful, received 3.00 USDX')
})

test('more-info block labels match HTML renderSwap', () => {
  const {
    SWAP_PRICE_LABEL,
    SWAP_SELL_MODE_LABEL,
    formatSwapMinRecvLabel,
    formatSwapRecvAmount,
    quoteSwapPreview,
  } = require('./swapQuote')
  const WAD = 10n ** 18n
  assert.equal(SWAP_PRICE_LABEL, '1 USDX = 1.0000 USDT')
  assert.equal(SWAP_SELL_MODE_LABEL, 'Open order (FIFO, not instant)')
  const sell = quoteSwapPreview('X2U', '100', 200n * WAD)
  assert.equal(formatSwapRecvAmount(sell.got), '99.90')
  assert.equal(formatSwapMinRecvLabel(sell.got, sell.recv), '99.9000 USDT')
  const buy = quoteSwapPreview('U2X', '100', 200n * WAD)
  assert.equal(formatSwapRecvAmount(buy.got), '100.00')
  assert.equal(formatSwapMinRecvLabel(buy.got, buy.recv), '100.0000 USDX')
  assert.equal(formatSwapMinRecvLabel(null, 'USDX'), '—')
})

test('recv 2dp and min-recv 4dp match HTML fmtNum for fee remainder', () => {
  const { formatSwapMinRecvLabel, formatSwapRecvAmount, quoteSwapPreview } = require('./swapQuote')
  const WAD = 10n ** 18n
  const sell = quoteSwapPreview('X2U', '0.25', WAD)
  // 0.24975 → 收到 2 位 0.25；至少收到 4 位 0.2497（与 HTML toFixed 一致）
  assert.equal(formatSwapRecvAmount(sell.got), '0.25')
  assert.equal(formatSwapMinRecvLabel(sell.got, 'USDT'), '0.2497 USDT')
})

test('swap pay limit messages distinguish wallet balance and inventory+pool', () => {
  const WAD = 10n ** 18n
  const buy = quoteSwapPreview('U2X', '10', 100n * WAD)
  assert.equal(
    getSwapPayLimitMessage(buy, {
      payBalanceWei: 100n * WAD,
      inventoryWei: 3n * WAD,
      poolWei: 2n * WAD,
      isBuy: true,
    }),
    'Insufficient USDX liquidity, max 5.00'
  )
  const overWallet = quoteSwapPreview('U2X', '10', 3n * WAD)
  assert.equal(
    getSwapPayLimitMessage(overWallet, {
      payBalanceWei: 3n * WAD,
      inventoryWei: 100n * WAD,
      poolWei: 0n,
      isBuy: true,
    }),
    'Insufficient USDT balance, max 3.00'
  )
  const sell = quoteSwapPreview('X2U', '10', 2n * WAD)
  assert.equal(
    getSwapPayLimitMessage(sell, { payBalanceWei: 2n * WAD, inventoryWei: null, isBuy: false }),
    'Insufficient USDX balance, max 2.00'
  )
  const fractional = quoteSwapPreview('U2X', '200', 10001n * 10n ** 16n)
  assert.equal(
    getSwapPayLimitMessage(fractional, {
      payBalanceWei: 10001n * 10n ** 16n,
      inventoryWei: 1000n * WAD,
      poolWei: 0n,
      isBuy: true,
    }),
    'Insufficient USDT balance, max 100.01'
  )
})

test('empty amount disables CTA; over-balance errors', () => {
  assert.equal(formatSwapFeeLabel(0n), 'Free')
  const empty = quoteSwapPreview('U2X', '', 60_000n * 10n ** 18n)
  assert.equal(empty.canSubmit, false)
  assert.equal(empty.got, 0n)
  const over = quoteSwapPreview('U2X', '70', 60n * 10n ** 18n)
  assert.equal(over.over, true)
  assert.equal(over.canSubmit, false)
  assert.equal(over.pay, 'USDT')
  const disconnected = quoteSwapPreview('U2X', '10', 0n)
  assert.equal(disconnected.canSubmit, false)
  assert.equal(disconnected.over, true)
})

test('unavailable balance never becomes a fake zero or submit-ready quote', () => {
  const unavailable = quoteSwapPreview('U2X', '1', null)

  assert.equal(unavailable.balanceKnown, false)
  assert.equal(unavailable.over, false)
  assert.equal(unavailable.canSubmit, false)
})

test('small decimal previews stay exact bigint values', () => {
  const buy = quoteSwapPreview('U2X', '0.000000000000000001', 1n)
  const sell = quoteSwapPreview('X2U', '0.0000001', 100000000000n)

  assert.equal(buy.got, 1n)
  assert.equal(sell.got, 99900000000n)
})

test('sell receive uses fixed 2dp like HTML fmtNum', () => {
  const { formatSwapRecvAmount, quoteSwapPreview } = require('./swapQuote')
  const WAD = 10n ** 18n
  const q = quoteSwapPreview('X2U', '0.21', 1n * WAD)
  assert.equal(formatSwapRecvAmount(q.got), '0.21')
})

test('sell recv keeps two decimals including fee remainder cases', () => {
  const { formatSwapRecvAmount, quoteSwapPreview } = require('./swapQuote')
  const WAD = 10n ** 18n
  const one = quoteSwapPreview('X2U', '1', 2n * WAD)
  assert.equal(formatSwapRecvAmount(one.got), '1.00')
  const tiny = quoteSwapPreview('X2U', '0.01', 2n * WAD)
  assert.equal(formatSwapRecvAmount(tiny.got), '0.01')
  const large = quoteSwapPreview('X2U', '100', 200n * WAD)
  assert.equal(formatSwapRecvAmount(large.got), '99.90')
})

test('sell min order and recv fallback when chain quote returns zero', () => {
  const {
    STABILIZER_MIN_SELL_WEI,
    STABILIZER_MIN_BUY_WEI,
    getBuyMinOrderMessage,
    getSellMinOrderMessage,
    getSellSettlementLabel,
    isBelowStabilizerMinBuy,
    isBelowStabilizerMinSell,
    quoteSwapPreview,
    resolveSellRecvWei,
  } = require('./swapQuote')
  const WAD = 10n ** 18n
  const local = quoteSwapPreview('X2U', '0.01', WAD).got

  assert.equal(STABILIZER_MIN_SELL_WEI, WAD)
  assert.equal(STABILIZER_MIN_BUY_WEI, 10n ** 16n)
  assert.equal(isBelowStabilizerMinSell(10n ** 16n), true)
  assert.equal(isBelowStabilizerMinSell(WAD), false)
  assert.equal(isBelowStabilizerMinBuy(10n ** 15n), true)
  assert.equal(isBelowStabilizerMinBuy(10n ** 16n), false)
  assert.equal(getSellMinOrderMessage(), 'Minimum sell is 1 USDX')
  assert.equal(getBuyMinOrderMessage(), 'Minimum buy is 0.01 USDT')
  assert.equal(resolveSellRecvWei(0n, local), local)
  assert.equal(resolveSellRecvWei(999n * 10n ** 16n, local), 999n * 10n ** 16n)
  assert.equal(
    getSellSettlementLabel({
      loading: false,
      instant: false,
      belowMin: false,
      reserveWei: 25n * 10n ** 15n,
      payWei: WAD,
    }),
    'Open order (FIFO, not instant)'
  )
  assert.equal(
    getSellSettlementLabel({ loading: false, instant: false, belowMin: true }),
    '—'
  )
  assert.equal(
    getSellSettlementLabel({ loading: false, instant: true, belowMin: false }),
    'Instant'
  )
  assert.equal(
    getSellSettlementLabel({ loading: false, instant: false, belowMin: false }),
    'Open order (FIFO, not instant)'
  )
})

test('instant sell fee is 0.5%; queued sell keeps the 0.1%-0.5% range', () => {
  const { getSwapSellFeeLabel } = require('./swapQuote')
  assert.equal(getSwapSellFeeLabel(true), '0.5%')
  assert.equal(getSwapSellFeeLabel(false), '0.1%-0.5%')
  assert.equal(getSwapSellFeeLabel(undefined), '0.1%-0.5%')
})

test('queued 0.1%-0.5% min received uses 0.5% worst case, not 0.1% best case', () => {
  const {
    formatSwapMinRecvLabel,
    formatSwapRecvAmount,
    previewSellRecvWei,
    resolveSellMinRecvWei,
  } = require('./swapQuote')
  const WAD = 10n ** 18n
  const pay = 10n * WAD
  const minWei = resolveSellMinRecvWei({ instant: false, amountWei: pay, netUsdt: 0n })
  assert.equal(formatSwapMinRecvLabel(minWei, 'USDT'), '9.9500 USDT')
  assert.notEqual(formatSwapMinRecvLabel(previewSellRecvWei(pay, false), 'USDT'), '9.9500 USDT')
  assert.equal(formatSwapRecvAmount(previewSellRecvWei(pay, false)), '9.99')
  const instantMin = resolveSellMinRecvWei({
    instant: true,
    amountWei: pay,
    netUsdt: 995n * 10n ** 16n,
  })
  assert.equal(formatSwapMinRecvLabel(instantMin, 'USDT'), '9.9500 USDT')
})

test('C29: synced quote.instant wins even when open market queue exists', () => {
  const { resolveSellInstantHint } = require('./swapQuote')
  const WAD = 10n ** 18n
  assert.equal(
    resolveSellInstantHint({
      quoteSynced: true,
      quoteInstant: true,
      payWei: WAD,
      reserveWei: 300n * WAD,
      queueCount: 1,
    }),
    true
  )
  assert.equal(
    resolveSellInstantHint({
      quoteSynced: true,
      quoteInstant: false,
      payWei: WAD,
      reserveWei: 300n * WAD,
      queueCount: 0,
    }),
    false
  )
  assert.equal(
    resolveSellInstantHint({
      quoteSynced: true,
      quoteInstant: true,
      payWei: WAD,
      reserveWei: 300n * WAD,
      queueCount: 0,
    }),
    true
  )
  assert.equal(
    resolveSellInstantHint({
      quoteSynced: false,
      quoteInstant: false,
      payWei: WAD,
      reserveWei: 300n * WAD,
      queueCount: 0,
    }),
    true
  )
  assert.equal(
    resolveSellInstantHint({
      quoteSynced: false,
      quoteInstant: true,
      payWei: WAD,
      reserveWei: 300n * WAD,
      queueCount: 1,
    }),
    false
  )
})

test('sell quote sync and instant reserve heuristic', () => {
  const {
    isSellQuoteAmountSynced,
    predictSellInstantFromReserve,
  } = require('./swapQuote')
  const WAD = 10n ** 18n
  assert.equal(isSellQuoteAmountSynced(WAD, WAD), true)
  assert.equal(isSellQuoteAmountSynced(WAD, 2n * WAD), false)
  assert.equal(isSellQuoteAmountSynced(0n, WAD), false)
  assert.equal(predictSellInstantFromReserve(WAD, 2n * WAD), true)
  assert.equal(predictSellInstantFromReserve(2n * WAD, WAD), false)
  assert.equal(predictSellInstantFromReserve(WAD, undefined), false)
})
