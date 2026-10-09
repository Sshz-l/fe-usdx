const test = require('node:test')
const assert = require('node:assert/strict')

const {
  aggregatePositions,
  chunkMintIds,
  formatDepositSplit,
  formatPlanDate,
  formatReleaseBarWidth,
  getAggregateReleaseBarProgress,
  getPlanPresentation,
  getPositionDetail,
  getReleaseAmount,
  sortMintIdsDesc,
} = require('./positionViews')

const WAD = 10n ** 18n
const pos = (mintId, daily = 1n * WAD) => ({
  mintId: BigInt(mintId),
  depositD: 10n * WAD,
  startTs: 1_700_000_000n,
  claimed: 0n,
  lockL0: 12n * WAD,
  elapsed: 10n,
  vested: 1n * WAD,
  claimableAmount: 2n * WAD,
  remainingLock: 7n * WAD,
  daily,
})

test('mint ids are newest-first and chunked by 20', () => {
  const ids = Array.from({ length: 45 }, (_, i) => BigInt(i + 1))
  const sorted = sortMintIdsDesc(ids)
  const batches = chunkMintIds(ids, 20)
  assert.equal(sorted[0], 45n)
  assert.equal(sorted[44], 1n)
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [20, 20, 5]
  )
  assert.equal(batches[0][0], 45n)
  assert.equal(batches[2][4], 1n)
})

test('aggregate sums daily/claimable/remainingLock and fails closed on partial batches', () => {
  const list = [pos(2, 3n * WAD), pos(1, 2n * WAD)]
  const agg = aggregatePositions(list)
  assert.equal(agg.daily, 5n * WAD)
  assert.equal(agg.claimable, 4n * WAD)
  assert.equal(agg.remainingLock, 14n * WAD)
  assert.equal(aggregatePositions(null), null)
})

test('position detail derives remaining days and end date from contract fields', () => {
  const detail = getPositionDetail(pos(9))
  assert.equal(detail.remainingDays, 324)
  assert.equal(detail.dayProgressLabel, 'Day 10 / 334')
  assert.match(detail.endDate, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(getReleaseAmount(pos(9)), 2n * WAD)
})

test('just-minted progress starts from 0 (no immediate credit)', () => {
  const detail = getPositionDetail({ ...pos(9), immediate: 0n, vested: 0n })
  assert.equal(detail.progress, 0)
  assert.equal(detail.barProgress, 0)
  assert.equal(formatReleaseBarWidth(detail.barProgress), '0.00%')
})

test('missing immediate field counts as 0, not 40% of deposit', () => {
  const detail = getPositionDetail({ ...pos(9), vested: 0n })
  assert.equal(detail.progress, 0)
})

test('day 90 of a 1000 mint fills 27.00% of the bar (was 51.33% with 40% immediate)', () => {
  const detail = getPositionDetail({
    ...pos(9),
    depositD: 1000n * WAD,
    totalUSDX: 1200n * WAD,
    immediate: 0n,
    lockL0: 1200n * WAD,
    vested: 324n * WAD, // 90 天 × 3.6
  })
  assert.equal(formatReleaseBarWidth(detail.barProgress), '27.00%')
})

test('position detail progress uses mint factor: (A+V)/D', () => {
  const detail = getPositionDetail(pos(9))
  // depositD=10, A=0, V=1 → 1/10 = 0.1
  assert.ok(Math.abs(detail.progress - 0.1) < 1e-9)
})

test('full release progress is 120% of deposit (not capped at 100%)', () => {
  const full = {
    ...pos(9),
    vested: 12n * WAD, // V=12 = M = 1.2D → 120%
  }
  const detail = getPositionDetail(full)
  assert.ok(Math.abs(detail.progress - 1.2) < 1e-9)
  assert.ok(Math.abs(detail.barProgress - 1) < 1e-9)
  assert.equal(formatReleaseBarWidth(detail.barProgress), '100.00%')
  assert.equal(formatReleaseBarWidth(1.2), '100.00%')
})

test('legacy positions with on-chain immediate>0 still count it as released', () => {
  const detail = getPositionDetail({ ...pos(9), immediate: 4n * WAD, vested: 0n })
  assert.ok(Math.abs(detail.progress - 0.4) < 1e-9)
})

test('progress falls back to totalUSDX / 1.2 when depositD is missing', () => {
  const detail = getPositionDetail({
    ...pos(9),
    depositD: undefined,
    payUSDT: undefined,
    totalUSDX: 12n * WAD,
    immediate: 0n,
    vested: 3n * WAD,
  })
  assert.ok(Math.abs(detail.progress - 0.3) < 1e-9)
  assert.ok(Math.abs(detail.barProgress - 3 / 12) < 1e-9)
})

test('aggregate release progress matches (ΣA+ΣV)/ΣD', () => {
  const { getAggregateReleaseProgress } = require('./positionViews')
  const list = [pos(2), pos(1)]
  // each: A=0, V=1, D=10 → 2/20 = 0.1
  assert.ok(Math.abs(getAggregateReleaseProgress(list) - 0.1) < 1e-9)
  assert.equal(getAggregateReleaseProgress([]), 0)
  // 条：2/24
  assert.ok(Math.abs(getAggregateReleaseBarProgress(list) - 2 / 24) < 1e-9)
  assert.equal(getAggregateReleaseBarProgress([]), 0)
})

test('plan presentation prefers on-chain totalUSDX / payUSDT / payBOX', () => {
  const start = new Date(2026, 6, 18, 12, 0, 0, 0)
  const startTs = BigInt(Math.floor(start.getTime() / 1000))
  const row = {
    mintId: 2n,
    totalUSDX: 30000n * WAD,
    payUSDT: 12500n * WAD,
    payBOX: 357142n * 10n ** 15n,
    immediate: 10000n * WAD,
    startTs,
    claimed: 0n,
    lockL0: 20000n * WAD,
    elapsed: 12n,
    vested: 720n * WAD,
    claimableAmount: 720n * WAD,
    remainingLock: 19280n * WAD,
    daily: 60n * WAD,
  }
  const plan = getPlanPresentation(row)
  assert.equal(plan.minted, 30000n * WAD)
  assert.equal(plan.immediate, 10000n * WAD)
  assert.equal(plan.depositSplit, '12,500.00 USDT + 357.14 BOX')
  assert.equal(plan.releasedTotal, plan.immediate + plan.vested)
  assert.ok(Math.abs(plan.barProgress - Number(plan.releasedTotal) / Number(plan.minted)) < 1e-9)
})

test('plan and claim bars use M-normalized fill without an immediate-credit mark', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const planSrc = fs.readFileSync(path.join(__dirname, '../../components/Usdx/UsdxPlan.tsx'), 'utf8')
  const claimSrc = fs.readFileSync(path.join(__dirname, '../../components/Usdx/UsdxClaim.tsx'), 'utf8')
  assert.match(planSrc, /formatReleaseBarWidth\(plan\.barProgress\)/)
  assert.match(claimSrc, /formatReleaseBarWidth\(/)
  assert.match(claimSrc, /getAggregateReleaseBarProgress/)
  for (const src of [planSrc, claimSrc]) {
    assert.doesNotMatch(src, /rel-mark/)
    assert.doesNotMatch(src, /IMMEDIATE_MARK/)
  }
})
