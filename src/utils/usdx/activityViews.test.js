const test = require('node:test')
const assert = require('node:assert/strict')

const { formatActivityRow, getActivityListState } = require('./activityViews')

test('activity kind 0-6 mapping follows the integration document', () => {
  const cases = [
    { kind: 0, title: 'Mint', tab: 'mint', dir: 'in', amount: '3 USDX' },
    { kind: 1, title: 'Claim', tab: 'claim', dir: 'in', amount: '1 USDX' },
    { kind: 2, title: 'Redeem', tab: 'redeem', dir: 'out', amount: '1 USDX' },
    { kind: 3, title: 'Sell settled', tab: 'swap', dir: 'out', amount: '2 USDT' },
    { kind: 4, title: 'Buy USDX', tab: 'swap', dir: 'in', amount: '2 USDX' },
    { kind: 5, title: 'Sell order', tab: 'swap', dir: 'out', amount: '1 USDX' },
    { kind: 6, title: 'Cancel order', tab: 'swap', dir: 'in', amount: '1 USDX' },
  ]

  for (const expected of cases) {
    const row = formatActivityRow({
      kind: expected.kind,
      mintId: 7n,
      a0: 10n ** 18n,
      a1: 2n * 10n ** 18n,
      a2: 3n * 10n ** 18n,
      extra: 0,
      ts: 1692000000n,
    })

    assert.deepEqual(
      { title: row.title, tab: row.tab, dir: row.dir, amount: row.amount },
      {
        title: expected.title,
        tab: expected.tab,
        dir: expected.dir,
        amount: expected.amount,
      },
      `kind ${expected.kind}`
    )
  }
})

test('instant sell list amount is gross USDX outflow, not net USDT', () => {
  const { getMineActivityPresentation, getActivityListPresentation } = require('./activityViews')
  const row = formatActivityRow({
    kind: 3,
    mintId: 0n,
    a0: 50n * 10n ** 18n,
    a1: 4995n * 10n ** 16n,
    a2: 5n * 10n ** 16n,
    extra: 0,
    ts: 1n,
  })
  assert.equal(row.dir, 'out')
  assert.equal(getMineActivityPresentation(row).amount, '-50.00')
  assert.equal(getActivityListPresentation(row).amount, '-50.00')
})

test('kind 3 sell detail pay is gross USDX only (not gross+fee)', () => {
  const { getSwapActivityDetail, formatActivityRow } = require('./activityViews')
  const WAD = 10n ** 18n
  const row = formatActivityRow({
    kind: 3,
    mintId: 0n,
    a0: 200n * WAD,
    a1: 19902n * 10n ** 16n,
    a2: 98n * 10n ** 16n,
    extra: 0,
    ts: 1n,
  })
  const detail = getSwapActivityDetail(row)
  assert.equal(detail.payLabel, '200 USDX')
  assert.equal(detail.recvLabel, '199.02 USDT')
  assert.equal(detail.feeLabel, '0.98 USDT')
})

test('activity read failures stay distinct from an empty result', () => {
  assert.equal(getActivityListState({ loading: true, error: false, count: 0 }), 'loading')
  assert.equal(getActivityListState({ loading: false, error: true, count: 0 }), 'error')
  assert.equal(getActivityListState({ loading: false, error: false, count: 0 }), 'empty')
  assert.equal(getActivityListState({ loading: false, error: false, count: 1 }), 'ready')
})

test('mine recent rows use HTML short titles, icons, and signed amounts', () => {
  const { getMineActivityPresentation } = require('./activityViews')
  const mint = formatActivityRow({
    kind: 0,
    mintId: 1n,
    a0: 0n,
    a1: 0n,
    a2: 30000n * 10n ** 18n,
    extra: 0,
    ts: BigInt(Math.floor(Date.UTC(2026, 6, 29) / 1000)),
  })
  const buy = formatActivityRow({
    kind: 4,
    mintId: 0n,
    a0: 5000n * 10n ** 18n,
    a1: 5000n * 10n ** 18n,
    a2: 0n,
    extra: 0,
    ts: BigInt(Math.floor(Date.UTC(2026, 7, 11, 9, 30) / 1000)),
  })
  const redeem = formatActivityRow({
    kind: 2,
    mintId: 0n,
    a0: 10000n * 10n ** 18n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: BigInt(Math.floor(Date.UTC(2026, 6, 31) / 1000)),
  })

  assert.deepEqual(getMineActivityPresentation(mint), {
    icon: 'pickaxe',
    title: 'Mint',
    amount: '+30,000.00',
    amountPos: true,
    date: '07-29',
  })
  assert.deepEqual(getMineActivityPresentation(buy), {
    icon: 'arrow-left-right',
    title: 'Swap',
    amount: '+5,000.00',
    amountPos: false,
    date: '08-11',
  })
  assert.deepEqual(getMineActivityPresentation(redeem), {
    icon: 'banknote',
    title: 'Redeem',
    amount: '-10,000.00',
    amountPos: false,
    date: '07-31',
  })
})

test('activity tuple arrays still map mint immediate amount and timestamp', () => {
  const { getMineActivityPresentation, normalizeActivityRaw } = require('./activityViews')
  const immediate = 40n * 10n ** 18n
  const ts = BigInt(Math.floor(Date.UTC(2026, 8, 14, 10, 0) / 1000))
  const raw = [0, 0, ts, 9n, 50n * 10n ** 18n, 50n * 10n ** 18n, immediate]
  assert.deepEqual(normalizeActivityRaw(raw), {
    kind: 0,
    extra: 0,
    ts,
    mintId: 9n,
    a0: 50n * 10n ** 18n,
    a1: 50n * 10n ** 18n,
    a2: immediate,
  })
  const row = formatActivityRow(raw)
  assert.equal(row.amount, '40 USDX')
  assert.deepEqual(getMineActivityPresentation(row), {
    icon: 'pickaxe',
    title: 'Mint',
    amount: '+40.00',
    amountPos: true,
    date: '09-14',
  })
})

test('mint without immediate credit shows registered credit M = 2.4 × usdtIn and is kept', () => {
  const { getMineActivityPresentation, isValidActivityRaw, mapActivities } = require('./activityViews')
  const ts = BigInt(Math.floor(Date.UTC(2026, 8, 14, 10, 0) / 1000))
  const raw = [0, 0, ts, 9n, 500n * 10n ** 18n, 50n * 10n ** 18n, 0n]
  assert.equal(isValidActivityRaw(raw), true)
  assert.equal(mapActivities([raw]).length, 1)
  const row = formatActivityRow(raw)
  assert.equal(row.amount, '1,200 USDX')
  assert.equal(getMineActivityPresentation(row).amount, '+1,200.00')
  assert.equal(getMineActivityPresentation(row).amountPos, true)
})

test('zero mint amount stays neutral without plus sign or green tone', () => {
  const { getMineActivityPresentation, getActivityListPresentation } = require('./activityViews')
  const zero = formatActivityRow({
    kind: 0,
    mintId: 1n,
    a0: 0n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1n,
  })
  assert.deepEqual(getMineActivityPresentation(zero), {
    icon: 'pickaxe',
    title: 'Mint',
    amount: '0.00',
    amountPos: false,
    date: '01-01',
  })
  assert.equal(getActivityListPresentation(zero).amount, '0.00')
  assert.equal(getActivityListPresentation(zero).amountPos, false)
})

test('mapActivities drops empty on-chain activity slots (ts=0)', () => {
  const { mapActivities, isValidActivityRaw } = require('./activityViews')
  const realTs = BigInt(Math.floor(Date.UTC(2026, 8, 14, 10, 0) / 1000))
  const real = {
    kind: 0,
    extra: 0,
    ts: realTs,
    mintId: 14n,
    a0: 5n * 10n ** 17n,
    a1: 1n,
    a2: 4n * 10n ** 17n,
  }
  const empty = { kind: 0, extra: 0, ts: 0n, mintId: 0n, a0: 0n, a1: 0n, a2: 0n }
  assert.equal(isValidActivityRaw(empty), false)
  assert.equal(isValidActivityRaw(real), true)
  const rows = mapActivities([real, empty, empty, empty, empty])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].amount, '0.40 USDX')
})

test('mapActivities drops misaligned mint rows with absurd timestamps', () => {
  const { mapActivities, isValidActivityRaw } = require('./activityViews')
  const realTs = BigInt(Math.floor(Date.UTC(2026, 8, 14, 10, 50) / 1000))
  const real = {
    kind: 0,
    extra: 0,
    ts: realTs,
    mintId: 14n,
    a0: 5n * 10n ** 17n,
    a1: 1n,
    a2: 4n * 10n ** 17n,
  }
  /* 链上错位样本：金额像 +100，但 ts/mintId 不可用，点进详情会空转补拉 */
  const corrupt = {
    kind: 0,
    extra: 0,
    ts: 15274017333984375n,
    mintId: 15109841667705798656n,
    a0: 0n,
    a1: 0n,
    a2: 100n * 10n ** 18n,
  }
  assert.equal(isValidActivityRaw(corrupt), false)
  const rows = mapActivities([real, corrupt])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].mintId, 14n)
})

test('mapActivities drops overflow amounts and zero primary wei rows', () => {
  const { mapActivities, isValidActivityRaw } = require('./activityViews')
  const realTs = BigInt(Math.floor(Date.UTC(2026, 8, 3, 12, 0) / 1000))
  const realMint = {
    kind: 0,
    extra: 0,
    ts: realTs,
    mintId: 14n,
    a0: 5n * 10n ** 17n,
    a1: 1n,
    a2: 4n * 10n ** 17n,
  }
  /* 截图中天文数字兑换：a0 远超 uint128 */
  const overflowSwap = {
    kind: 3,
    extra: 0,
    ts: realTs,
    mintId: 27n,
    a0: (1n << 128n) + 1n,
    a1: 2793967n,
    a2: 6044629098190357491482625n,
  }
  /* 领取 0.00：主字段 a0=0，垃圾落在 a2 */
  const zeroClaim = {
    kind: 1,
    extra: 0,
    ts: realTs,
    mintId: 5n,
    a0: 0n,
    a1: 0n,
    a2: 14507109835492778962321409n,
  }
  /* 买入 0.00：a1=0 且 a2 非约定的 0 */
  const zeroBuy = {
    kind: 4,
    extra: 0,
    ts: realTs,
    mintId: 0n,
    a0: 1000n * 10n ** 18n,
    a1: 0n,
    a2: 8462480737419609229230085n,
  }
  assert.equal(isValidActivityRaw(overflowSwap), false)
  assert.equal(isValidActivityRaw(zeroClaim), false)
  assert.equal(isValidActivityRaw(zeroBuy), false)
  const rows = mapActivities([realMint, overflowSwap, zeroClaim, zeroBuy])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].kind, 0)
})

test('activity lists preserve non-zero fractional amounts', () => {
  const cases = [
    { kind: 0, field: 'a2', amount: 4n * 10n ** 17n, expected: '0.40 USDX' },
    { kind: 1, field: 'a0', amount: 2880000000000000n, expected: '0.0029 USDX' },
    { kind: 2, field: 'a0', amount: 10n ** 16n, expected: '0.01 USDX' },
    { kind: 3, field: 'a1', amount: 10n ** 16n, expected: '0.01 USDT' },
    { kind: 4, field: 'a1', amount: 4n * 10n ** 17n, expected: '0.40 USDX' },
  ]

  for (const item of cases) {
    const row = formatActivityRow({
      kind: item.kind,
      mintId: 1n,
      a0: item.field === 'a0' ? item.amount : 0n,
      a1: item.field === 'a1' ? item.amount : 0n,
      a2: item.field === 'a2' ? item.amount : 0n,
      extra: 0,
      ts: 1n,
    })
    assert.equal(row.amount, item.expected, `kind ${item.kind}`)
  }

  const { getMineActivityPresentation } = require('./activityViews')
  const early = formatActivityRow({
    kind: 1,
    mintId: 1n,
    a0: 2880000000000000n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1n,
  })
  assert.equal(getMineActivityPresentation(early).amount, '+0.0029')
})

test('swap detail shows sub-cent sell fee and recv with fine precision', () => {
  const { getSwapActivityDetail, formatActivityRow } = require('./activityViews')
  const row = formatActivityRow({
    kind: 5,
    mintId: 2n,
    a0: 4n * 10n ** 16n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1787723498n,
  })
  const detail = getSwapActivityDetail(row)
  assert.equal(detail.payLabel, '0.04 USDX')
  assert.equal(detail.recvLabel, '0.03996 USDT')
  assert.equal(detail.feeLabel, '0.00004 USDX')
})

test('swap detail route key restores formatted activity row after refresh', () => {
  const { formatActivityRow, formatActivityRowFromRouteKey, getSwapDetailRouteKey } =
    require('./activityViews')
  const row = formatActivityRow({
    kind: 5,
    mintId: 8n,
    a0: 4n * 10n ** 16n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1787723498n,
  })
  const key = getSwapDetailRouteKey(row)
  const restored = formatActivityRowFromRouteKey(key)
  assert.equal(restored?.kind, row.kind)
  assert.equal(restored?.mintId, row.mintId)
  assert.equal(restored?.ts, row.ts)
  assert.equal(restored?.a0, row.a0)
  assert.equal(restored?.amount, row.amount)
})

test('swap detail sheet fields match HTML swapDetailRows', () => {
  const { getSwapActivityDetail, formatActivityDateTime } = require('./activityViews')
  const local = new Date(2026, 7, 11, 9, 30, 0, 0)
  const ts = BigInt(Math.floor(local.getTime() / 1000))
  const buy = formatActivityRow({
    kind: 4,
    mintId: 0n,
    a0: 5000n * 10n ** 18n,
    a1: 5000n * 10n ** 18n,
    a2: 0n,
    extra: 0,
    ts,
  })
  const detail = getSwapActivityDetail(buy)
  assert.equal(formatActivityDateTime(ts), '2026-08-11 09:30')
  assert.equal(detail.timeLabel, '2026-08-11 09:30')
  assert.equal(detail.payLabel, '5,000 USDT')
  assert.equal(detail.recvLabel, '5,000 USDX')
  assert.equal(detail.feeLabel, 'Free')
  assert.equal(detail.dirLabel, 'Buy · USDT → USDX')
})

test('swap detail preserves fractional sell queue amounts', () => {
  const { getSwapActivityDetail, formatActivityRow } = require('./activityViews')
  const queued = formatActivityRow({
    kind: 5,
    mintId: 8n,
    a0: 10n ** 16n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1787723498n,
  })
  const detail = getSwapActivityDetail(queued, { orderStatus: 1 })
  assert.equal(detail.payLabel, '0.01 USDX')
  assert.equal(detail.recvLabel, '0.00999 USDT')
  assert.equal(detail.feeLabel, '0.00001 USDX')
  assert.equal(detail.dirLabel, 'Sell · USDX → USDT')
  assert.equal(detail.orderId, 8n)
  assert.equal(detail.canCancel, true)
  assert.equal(detail.status, 'Open')
})

test('kind 5 detail reflects sellOrder status after queue settles', () => {
  const { getSwapActivityDetail, formatActivityRow } = require('./activityViews')
  const row = formatActivityRow({
    kind: 5,
    mintId: 3n,
    a0: 10n ** 18n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1787723498n,
  })
  const claimable = getSwapActivityDetail(row, {
    orderStatus: 1,
    orderRemaining: 0n,
    grossClaimable: 999n * 10n ** 15n,
  })
  assert.equal(claimable.status, 'Claimable')
  assert.equal(claimable.statusCls, 'done')
  assert.equal(claimable.canClaim, true)
  assert.equal(claimable.canCancel, false)
  const filled = getSwapActivityDetail(row, { orderStatus: 1, orderRemaining: 0n, grossClaimable: 0n })
  assert.equal(filled.status, 'Filled')
  assert.equal(filled.canCancel, false)
  const cancelled = getSwapActivityDetail(row, { orderStatus: 2 })
  assert.equal(cancelled.status, 'Cancelled')
  assert.equal(cancelled.statusCls, 'cancelled')
  assert.equal(cancelled.recvLabel, '—')
  assert.equal(cancelled.canCancel, false)
  const pending = getSwapActivityDetail(row, { orderStatus: 1, orderRemaining: 10n ** 18n })
  assert.equal(pending.status, 'Open')
  assert.equal(pending.canCancel, true)
})

test('queued sell detail inserts filled after pay; done/cancelled hide filled and cancel', () => {
  const { getSwapActivityDetail, formatActivityRow, buildSwapDetailInfoRows } = require('./activityViews')
  const WAD = 10n ** 18n
  const row = formatActivityRow({
    kind: 5,
    mintId: 3n,
    a0: 1000n * WAD,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: 1787723498n,
  })
  const queued = getSwapActivityDetail(row, {
    orderStatus: 1,
    orderRemaining: 800n * WAD,
    orderAmount: 1000n * WAD,
  })
  assert.equal(queued.status, 'Open')
  assert.equal(queued.canCancel, true)
  assert.equal(queued.filledLabel, '200.00 USDX')
  assert.deepEqual(
    buildSwapDetailInfoRows(queued, '1 USDX = 1.0000 USDT').map(([label]) => label),
    ['Time', 'Pay', 'Filled amount', 'Receive', 'Fee', 'Price']
  )

  const zeroFill = getSwapActivityDetail(row, {
    orderStatus: 1,
    orderRemaining: 1000n * WAD,
    orderAmount: 1000n * WAD,
  })
  assert.equal(zeroFill.filledLabel, '0.00 USDX')
  assert.equal(zeroFill.canCancel, true)

  const halfFill = getSwapActivityDetail(row, {
    orderStatus: 1,
    orderRemaining: 5n * 10n ** 17n,
    orderAmount: 3n * WAD,
  })
  assert.equal(halfFill.filledLabel, '2.50 USDX')
  assert.equal(halfFill.canCancel, true)

  const done = getSwapActivityDetail(row, { orderStatus: 1, orderRemaining: 0n, grossClaimable: 0n })
  assert.equal(done.status, 'Filled')
  assert.equal(done.filledLabel, null)
  assert.equal(done.canCancel, false)
  assert.deepEqual(
    buildSwapDetailInfoRows(done, '1 USDX = 1.0000 USDT').map(([label]) => label),
    ['Time', 'Pay', 'Receive', 'Fee', 'Price']
  )

  const cancelled = getSwapActivityDetail(row, { orderStatus: 2 })
  assert.equal(cancelled.filledLabel, null)
  assert.equal(cancelled.canCancel, false)
})

test('queued sell detail uses orderFilledAt when fully filled, not activity ts', () => {
  const { getSwapActivityDetail, formatActivityDateTime, formatActivityRow } = require('./activityViews')
  const enqueue = new Date(2026, 8, 14, 17, 0, 0, 0)
  const filled = new Date(2026, 8, 15, 10, 30, 0, 0)
  const enqueueTs = BigInt(Math.floor(enqueue.getTime() / 1000))
  const filledAt = BigInt(Math.floor(filled.getTime() / 1000))
  const row = formatActivityRow({
    kind: 5,
    mintId: 9n,
    a0: 10n ** 18n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts: enqueueTs,
  })
  const unfilled = getSwapActivityDetail(row, { orderStatus: 1, orderRemaining: 10n ** 18n, filledAt: 0n })
  assert.equal(unfilled.timeLabel, formatActivityDateTime(enqueueTs))
  const pending = getSwapActivityDetail(row, {
    orderStatus: 1,
    orderRemaining: 0n,
    grossClaimable: 10n ** 18n,
    filledAt,
  })
  assert.equal(pending.timeLabel, formatActivityDateTime(filledAt))
  assert.equal(pending.timeLabel, '2026-09-15 10:30')
  assert.notEqual(pending.timeLabel, formatActivityDateTime(enqueueTs))
})

test('queued kind 3 claim row uses orderFilledAt, instant sell keeps activity ts', () => {
  const { getSwapActivityDetail, formatActivityDateTime, formatActivityRow } = require('./activityViews')
  const claimLocal = new Date(2026, 8, 16, 12, 0, 0, 0)
  const filledLocal = new Date(2026, 8, 15, 10, 30, 0, 0)
  const claimTs = BigInt(Math.floor(claimLocal.getTime() / 1000))
  const filledAt = BigInt(Math.floor(filledLocal.getTime() / 1000))
  const queuedClaim = formatActivityRow({
    kind: 3,
    mintId: 9n,
    a0: 10n ** 18n,
    a1: 999n * 10n ** 15n,
    a2: 10n ** 15n,
    extra: 0,
    ts: claimTs,
  })
  const claimed = getSwapActivityDetail(queuedClaim, { filledAt })
  assert.equal(claimed.timeLabel, formatActivityDateTime(filledAt))
  const pendingFill = getSwapActivityDetail(queuedClaim, { filledAtPending: true })
  assert.equal(pendingFill.timeLabel, formatActivityDateTime(claimTs))
  const historicalClaim = getSwapActivityDetail(queuedClaim, { filledAt: 0n })
  assert.equal(historicalClaim.timeLabel, formatActivityDateTime(claimTs))
  const instant = formatActivityRow({
    kind: 3,
    mintId: 0n,
    a0: 10n ** 18n,
    a1: 995n * 10n ** 15n,
    a2: 5n * 10n ** 15n,
    extra: 0,
    ts: claimTs,
  })
  const instantDetail = getSwapActivityDetail(instant, { filledAt })
  assert.equal(instantDetail.timeLabel, formatActivityDateTime(claimTs))
})

test('full activity list uses HTML short titles and signed amounts without suffix', () => {
  const { formatActivityRow, getActivityListPresentation, formatActivityListTime } =
    require('./activityViews')
  const today = new Date()
  today.setHours(9, 30, 0, 0)
  const ts = BigInt(Math.floor(today.getTime() / 1000))
  const buy = formatActivityRow({
    kind: 4,
    mintId: 0n,
    a0: 5000n * 10n ** 18n,
    a1: 5000n * 10n ** 18n,
    a2: 0n,
    extra: 0,
    ts,
  })
  const claim = formatActivityRow({
    kind: 1,
    mintId: 1n,
    a0: 2880000000000000n,
    a1: 0n,
    a2: 0n,
    extra: 0,
    ts,
  })
  assert.deepEqual(getActivityListPresentation(buy), {
    icon: 'arrow-left-right',
    title: 'Swap',
    amount: '+5,000.00',
    amountPos: false,
    time: formatActivityListTime(ts),
  })
  assert.deepEqual(getActivityListPresentation(claim), {
    icon: 'hand-coins',
    title: 'Claim',
    amount: '+0.0029',
    amountPos: false,
    time: formatActivityListTime(ts),
  })
  const mint = formatActivityRow({
    kind: 0,
    mintId: 2n,
    a0: 0n,
    a1: 0n,
    a2: 30000n * 10n ** 18n,
    extra: 0,
    ts: BigInt(Math.floor(Date.UTC(2026, 6, 29) / 1000)),
  })
  assert.equal(getActivityListPresentation(mint).title, 'Mint')
  assert.equal(getActivityListPresentation(mint).amount, '+30,000.00')
  assert.equal(getActivityListPresentation(mint).amountPos, true)
})

test('activity list state keeps loading while filtered tab awaits more raw pages', () => {
  const { getActivityListState } = require('./activityViews')
  assert.equal(
    getActivityListState({ loading: false, error: false, count: 0, awaitingMore: true }),
    'loading'
  )
})
