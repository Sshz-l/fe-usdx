const test = require('node:test')
const assert = require('node:assert/strict')

const {
  appendOrderPage,
  asSellOrderView,
  canCancelSellOrder,
  canClaimSellOrder,
  isFullyFilledPendingClaim,
  createOrderPagination,
  formatGlobalSellQueueText,
  formatSellInstantSuccessMessage,
  formatSellQueueSuccessMessage,
  formatSellSuccessMessage,
  getCancelSellSuccessMessage,
  getSellCtaLabel,
  isSellInstantFill,
  shouldRefreshActiveSellOrders,
  resolveSellWriteName,
  getSellOrderStatus,
  filterOpenHangOrders,
  getSellOrdersPresentation,
  getSellPreview,
  getStabilizerWriteGate,
  formatHangOrderAmount,
  mapSellOrder,
  sumQueuedRemaining,
} = require('./orderViews')
const { quoteSwapPreview } = require('./swapQuote')

const WAD = 10n ** 18n

test('sell preview uses 10 bps bigint math as local fallback', () => {
  const preview = getSellPreview(100n * WAD)
  assert.equal(preview.feeBps, 10n)
  assert.equal(preview.usdtOut, 999n * 10n ** 17n)
  assert.equal(preview.cta, 'Submit order')
  assert.equal(quoteSwapPreview('X2U', '100', 100n * WAD).got, preview.usdtOut)
})

test('sell success messages distinguish instant vs queue', () => {
  assert.equal(formatSellInstantSuccessMessage(3n * WAD), 'Swap successful, received 3.00 USDT')
  assert.equal(formatSellQueueSuccessMessage(3n * WAD), 'Order placed, will settle 3.00 USDT')
  assert.equal(
    formatSellSuccessMessage({ instant: true, netUsdt: 3n * WAD, amount: 3n * WAD }),
    'Swap successful, received 3.00 USDT'
  )
  assert.equal(
    formatSellSuccessMessage({ instant: false, amount: 3n * WAD }),
    'Order placed, will settle 3.00 USDT'
  )
})

test('C29 sell CTA: instant Swap, queue Submit order', () => {
  assert.equal(getSellCtaLabel({ instant: true, submitting: false }), 'Swap')
  assert.equal(getSellCtaLabel({ instant: false, submitting: false }), 'Submit order')
  assert.equal(getSellCtaLabel({ instant: true, submitting: true }), 'Processing…')
  assert.equal(getSellCtaLabel({ instant: false, submitting: true }), 'Submitting…')
  assert.equal(getSellCtaLabel({ instant: false, submitting: false, loading: true }), 'Quoting…')
})

test('C29 write path: instant→sellInstant, else→sell', () => {
  assert.equal(resolveSellWriteName(true), 'sellInstant')
  assert.equal(resolveSellWriteName(false), 'sell')
  assert.equal(resolveSellWriteName(undefined), 'sell')
})

test('isSellInstantFill prefers orderId over quote', () => {
  assert.equal(isSellInstantFill(0n, false), true)
  assert.equal(isSellInstantFill(1n, true), false)
  assert.equal(isSellInstantFill(null, true), true)
  assert.equal(isSellInstantFill(null, false), false)
})

test('sell orderId>0 refreshes active hang orders; 0 is instant fill', () => {
  assert.equal(shouldRefreshActiveSellOrders(0n), false)
  assert.equal(shouldRefreshActiveSellOrders(1n), true)
  assert.equal(shouldRefreshActiveSellOrders(null), false)
})

test('only open orders with remaining can cancel, pause still allows cancel', () => {
  assert.equal(canCancelSellOrder({ status: 1, remaining: WAD }), true)
  assert.equal(canCancelSellOrder({ status: 1, remaining: 0n }), false)
  assert.equal(canCancelSellOrder({ status: 2 }), false)
  const paused = getStabilizerWriteGate({ paused: true })
  assert.equal(paused.buy, false)
  assert.equal(paused.sell, false)
  assert.equal(paused.cancel, true)
})

test('claim requires open status, zero remaining, and grossClaimable', () => {
  assert.equal(canClaimSellOrder({ status: 1, remaining: 0n }, WAD), true)
  assert.equal(canClaimSellOrder({ status: 1, remaining: 0n }, 0n), false)
  assert.equal(canClaimSellOrder({ status: 1, remaining: WAD }, WAD), false)
})

test('fully filled pending claim requires zero refund, claimable USDT, and filledAt', () => {
  assert.equal(
    isFullyFilledPendingClaim({ refundClaimable: 0n, grossClaimable: WAD, filledAt: 1_780_000_000n }),
    true
  )
  assert.equal(
    isFullyFilledPendingClaim({ refundClaimable: 1n, grossClaimable: WAD, filledAt: 1_780_000_000n }),
    false
  )
  assert.equal(
    isFullyFilledPendingClaim({ refundClaimable: 0n, grossClaimable: 0n, filledAt: 1_780_000_000n }),
    false
  )
  assert.equal(
    isFullyFilledPendingClaim({ refundClaimable: 0n, grossClaimable: WAD, filledAt: 0n }),
    false
  )
})

test('cancelSell success message distinguishes cancel vs claim fallback', () => {
  assert.equal(getCancelSellSuccessMessage(2), 'Order cancelled')
  assert.equal(getCancelSellSuccessMessage(null, { claimedUsdt: true }), 'USDT claimed')
  assert.equal(getCancelSellSuccessMessage(null), 'Done')
})

test('queued remaining summary only counts cancellable open orders', () => {
  const orders = [
    { status: 1, amount: 10n * WAD, remaining: 4n * WAD },
    { status: 1, amount: 8n * WAD, remaining: 0n },
    { status: 1, amount: 3n * WAD },
    { status: 2, amount: 9n * WAD, remaining: 0n },
  ]

  assert.equal(sumQueuedRemaining(orders), 7n * WAD)
  assert.deepEqual(getSellOrdersPresentation(orders), {
    hasHistory: true,
    queuedOrders: [orders[0], orders[2]],
    queuedCount: 2,
    queuedAmount: 7n * WAD,
  })
  assert.deepEqual(filterOpenHangOrders(orders), [orders[0], orders[2]])
})

test('hang-order drawer hides fully filled and cancelled rows', () => {
  const filled = { status: 1, amount: 1001n * WAD, remaining: 0n }
  const cancelled = { status: 2, amount: WAD, remaining: 0n }
  const open = { status: 1, amount: 3n * WAD, remaining: 3n * WAD }
  assert.deepEqual(filterOpenHangOrders([filled, cancelled, open]), [open])
  assert.deepEqual(filterOpenHangOrders([filled]), [])
})

test('global sell queue text follows design mock format', () => {
  assert.equal(
    formatGlobalSellQueueText({
      amountWei: 32000n * WAD,
      count: 6,
      amountLoading: false,
      countLoading: false,
    }),
    '32,000.00 USDX · 6 orders'
  )
  assert.equal(
    formatGlobalSellQueueText({
      amountWei: 0n,
      count: 0,
      amountLoading: false,
      countLoading: false,
    }),
    '0.00 USDX · 0 orders'
  )
  assert.equal(
    formatGlobalSellQueueText({
      amountWei: 4n * 10n ** 17n,
      count: 1,
      amountLoading: false,
      countLoading: false,
    }),
    '0.40 USDX · 1 orders'
  )
  assert.equal(
    formatGlobalSellQueueText({
      amountWei: 1n * WAD,
      count: null,
      amountLoading: false,
      countLoading: false,
    }),
    '—'
  )
})

test('order rows reflect new stabilizer status semantics', () => {
  const queued = mapSellOrder({
    orderId: 1n,
    status: 1,
    amount: 10n * WAD,
    remaining: 4n * WAD,
    createAt: 1n,
  })
  const claimable = mapSellOrder(
    {
      orderId: 2n,
      status: 1,
      amount: 10n * WAD,
      remaining: 0n,
      createAt: 2n,
    },
    { grossClaimable: WAD }
  )
  const filled = mapSellOrder({
    orderId: 3n,
    status: 1,
    amount: 10n * WAD,
    remaining: 0n,
    createAt: 3n,
  })
  const cancelled = mapSellOrder({
    orderId: 4n,
    status: 2,
    amount: 10n * WAD,
    remaining: 0n,
    createAt: 4n,
  })

  assert.equal(queued.canCancel, true)
  assert.equal(queued.label, 'Open')
  assert.equal(queued.filled, 6n * WAD)
  assert.equal(queued.displayAmount, 10n * WAD)
  assert.equal(claimable.canClaim, true)
  assert.equal(claimable.label, 'Claimable')
  assert.equal(claimable.filled, 10n * WAD)
  assert.equal(filled.label, 'Filled')
  assert.equal(cancelled.label, 'Cancelled')
})

test('mapSellOrder exposes zero fill when remaining equals amount', () => {
  const open = mapSellOrder({
    orderId: 5n,
    status: 1,
    amount: 3000n * WAD,
    remaining: 3000n * WAD,
    createAt: 5n,
  })
  assert.equal(open.filled, 0n)
  assert.equal(open.displayAmount, 3000n * WAD)
  assert.equal(open.canCancel, true)
})

test('mapSellOrder exposes partial fill as filled = amount - remaining', () => {
  const partial = mapSellOrder({
    orderId: 6n,
    status: 1,
    amount: 3000n * WAD,
    remaining: 2800n * WAD,
    createAt: 6n,
  })
  assert.equal(partial.filled, 200n * WAD)
  assert.equal(partial.displayAmount, 3000n * WAD)
  assert.equal(partial.canCancel, true)
})

test('hang-order amounts keep 2dp so 2.5 filled is not rounded to 3', () => {
  const partial = mapSellOrder({
    orderId: 2n,
    status: 1,
    amount: 3n * WAD,
    remaining: 5n * 10n ** 17n,
    createAt: 1n,
  })
  assert.equal(partial.filled, 25n * 10n ** 17n)
  assert.equal(partial.displayAmount, 3n * WAD)
  assert.equal(formatHangOrderAmount(partial.filled), '2.50')
  assert.equal(formatHangOrderAmount(partial.displayAmount), '3.00')
  assert.equal(formatHangOrderAmount(0n), '0.00')
  assert.equal(partial.canCancel, true)
})

test('asSellOrderView decodes sellOrder and sellOrdersOf tuple layouts', () => {
  const listRow = asSellOrderView([
    9n,
    '0x0000000000000000000000000000000000000001',
    10n * WAD,
    4n * WAD,
    123n,
    999n,
    1,
  ])
  assert.deepEqual(listRow, {
    orderId: 9n,
    user: '0x0000000000000000000000000000000000000001',
    amount: 10n * WAD,
    remaining: 4n * WAD,
    createAt: 123n,
    start: 999n,
    status: 1,
  })

  const singleRow = asSellOrderView(
    ['0x0000000000000000000000000000000000000002', 8n * WAD, 3n * WAD, 456n, 888n, 2],
    7n
  )
  assert.deepEqual(singleRow, {
    orderId: 7n,
    user: '0x0000000000000000000000000000000000000002',
    amount: 8n * WAD,
    remaining: 3n * WAD,
    createAt: 456n,
    start: 888n,
    status: 2,
  })
})

test('cancel outcome status reads named sellOrder fields', () => {
  assert.equal(
    getSellOrderStatus({
      user: '0x0',
      amount: 10n * WAD,
      remaining: 4n * WAD,
      createAt: 123n,
      status: 2,
    }),
    2
  )
  assert.equal(getSellOrderStatus(['0x0', 10n * WAD, 4n * WAD, 123n, 0n, 2]), 2)
  assert.equal(getSellOrderStatus(null), null)
})

test('order pages merge 20-row offsets without dropping history', () => {
  const first = appendOrderPage(
    createOrderPagination(),
    [
      { orderId: 21n, status: 1, amount: WAD, createAt: 1n },
      { orderId: 20n, status: 2, amount: WAD, createAt: 2n },
    ],
    22n
  )
  const second = appendOrderPage(
    first,
    Array.from({ length: 20 }, (_, i) => ({
      orderId: BigInt(19 - i),
      status: 2,
      amount: WAD,
      createAt: BigInt(i + 3),
    })),
    22n
  )
  assert.equal(first.hasMore, true)
  assert.equal(second.items.length, 22)
  assert.equal(second.loadedRaw, 22n)
  assert.equal(second.hasMore, false)
  assert.equal(mapSellOrder({ orderId: 1n, status: 1, amount: WAD, remaining: WAD, createAt: 0n }).label, 'Open')
  assert.equal(mapSellOrder({ orderId: 1n, status: 2, amount: WAD, createAt: 0n }).label, 'Cancelled')
})
