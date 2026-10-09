const { formatUsdxAmount } = require('./homeViews')
const { usdxT } = require('./usdxI18n')

const POSITION_BATCH_SIZE = 20
const RELEASE_DAYS = 334n
const DAY_SEC = 86400n
const WAD = 10n ** 18n

const toRatio = (num, den) => {
  if (den <= 0n) return 0
  const value = Number(num) / Number(den)
  return Number.isFinite(value) ? value : 0
}

const formatReleaseBarWidth = (barProgress) =>
  `${Math.min(100, Math.max(0, Number(barProgress) || 0) * 100).toFixed(2)}%`

const sortMintIdsDesc = (ids) =>
  [...(ids || [])]
    .map((id) => BigInt(id))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

const chunkMintIds = (ids, size = POSITION_BATCH_SIZE) => {
  const sorted = sortMintIdsDesc(ids)
  const batches = []
  for (let i = 0; i < sorted.length; i += size) {
    batches.push(sorted.slice(i, i + size))
  }
  return batches
}

const sumField = (positions, key) =>
  positions.reduce((sum, item) => sum + BigInt(item?.[key] ?? 0), 0n)

const aggregatePositions = (positions) => {
  if (!Array.isArray(positions)) return null
  return {
    claimable: sumField(positions, 'claimableAmount'),
    remainingLock: sumField(positions, 'remainingLock'),
    daily: sumField(positions, 'daily'),
    lockL0: sumField(positions, 'lockL0'),
    vested: sumField(positions, 'vested'),
    count: positions.length,
  }
}

const getReleaseAmount = (position) => BigInt(position?.claimableAmount ?? 0)

/** YYYY-MM-DD，与权威 HTML / 截图一致 */
const formatPlanDate = (ts) => {
  const n = Number(ts)
  if (!n) return '—'
  const d = new Date(n * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * wiki positionOf：D = 2·payUSDT；旧布局仅有 depositD。
 */
const resolveDepositD = (position) => {
  if (position?.depositD != null && position.depositD !== '') return BigInt(position.depositD)
  const payUsdt = BigInt(position?.payUSDT ?? 0)
  if (payUsdt > 0n) return payUsdt * 2n
  return 0n
}

/** 进度分母：缺 depositD 时用 M/1.2（与 6/5 铸造系数互逆） */
const resolveProgressDepositD = (position) => {
  const depositD = resolveDepositD(position)
  if (depositD > 0n) return depositD
  const minted = resolveMinted(position)
  if (minted > 0n) return (minted * 5n) / 6n
  return 0n
}

const releasedAmount = (position) =>
  resolveImmediate(position) + BigInt(position?.vested ?? 0)

/** 现行铸造不立即到账；仅旧仓位链上带 immediate>0，缺字段时按 0 计 */
const resolveImmediate = (position) => {
  if (position?.immediate != null && position.immediate !== '') return BigInt(position.immediate)
  return 0n
}

const resolveMinted = (position) => {
  if (position?.totalUSDX != null && position.totalUSDX !== '') return BigInt(position.totalUSDX)
  return (resolveDepositD(position) * 6n) / 5n
}

/**
 * 总投入展示：优先链上 payUSDT + payBOX；否则用 D/2 与标记价估算 BOX。
 */
const formatDepositSplit = (depositOrPosition, boxPriceWad) => {
  if (depositOrPosition != null && typeof depositOrPosition === 'object') {
    const payUsdt = depositOrPosition.payUSDT
    const payBox = depositOrPosition.payBOX
    if (payUsdt != null || payBox != null) {
      const u = BigInt(payUsdt ?? 0)
      const b = BigInt(payBox ?? 0)
      if (u <= 0n && b <= 0n) return '—'
      return `${formatUsdxAmount(u, 2)} USDT + ${formatUsdxAmount(b, 2)} BOX`
    }
    return formatDepositSplit(resolveDepositD(depositOrPosition), boxPriceWad)
  }
  const d = BigInt(depositOrPosition ?? 0)
  if (d <= 0n) return '—'
  const half = d / 2n
  const usdt = `${formatUsdxAmount(half, 2)} USDT`
  const p = BigInt(boxPriceWad ?? 0)
  if (p <= 0n) return `${usdt} + — BOX`
  const boxIn = (half * WAD) / p
  return `${usdt} + ${formatUsdxAmount(boxIn, 2)} BOX`
}

const getPositionDetail = (position) => {
  if (!position) {
    return {
      remainingDays: null,
      endDate: '—',
      startDate: '—',
      progress: 0,
      barProgress: 0,
      elapsed: null,
      totalDays: Number(RELEASE_DAYS),
      dayProgressLabel: '—',
    }
  }
  const elapsed = Number(position.elapsed)
  const totalDays = Number(RELEASE_DAYS)
  const remainingDays = Number.isFinite(elapsed) ? Math.max(0, totalDays - elapsed) : null
  const startTs = BigInt(position.startTs ?? 0)
  const endTs = startTs + RELEASE_DAYS * DAY_SEC
  const released = releasedAmount(position)
  // 文案：(A+V)/D → 满释 120%。条：(A+V)/M → 满释 100%。现行 A=0，两者都从 0 起算。
  const progress = toRatio(released, resolveProgressDepositD(position))
  const barProgress = toRatio(released, resolveMinted(position))
  const dayProgressLabel =
    remainingDays == null
      ? '—'
      : remainingDays > 0 && Number.isFinite(elapsed)
        ? usdxT('Day {elapsed} / {totalDays}', { elapsed, totalDays })
        : usdxT('Fully released')
  return {
    remainingDays,
    endDate: startTs > 0n ? formatPlanDate(endTs) : '—',
    startDate: startTs > 0n ? formatPlanDate(startTs) : '—',
    progress,
    barProgress,
    elapsed: Number.isFinite(elapsed) ? elapsed : null,
    totalDays,
    dayProgressLabel,
  }
}

const sumReleasedAndBases = (positions) => {
  let released = 0n
  let sumD = 0n
  let sumM = 0n
  for (const position of positions) {
    released += releasedAmount(position)
    sumD += resolveProgressDepositD(position)
    sumM += resolveMinted(position)
  }
  return { released, sumD, sumM }
}

/** 聚合文案进度：(ΣA + ΣV) / ΣD */
const getAggregateReleaseProgress = (positions) => {
  if (!Array.isArray(positions) || positions.length === 0) return 0
  const { released, sumD } = sumReleasedAndBases(positions)
  return toRatio(released, sumD)
}

/** 聚合进度条：(ΣA + ΣV) / ΣM，满释才到 100% */
const getAggregateReleaseBarProgress = (positions) => {
  if (!Array.isArray(positions) || positions.length === 0) return 0
  const { released, sumM } = sumReleasedAndBases(positions)
  return toRatio(released, sumM)
}

/**
 * s-plan 展示模型（对齐 HTML renderPlan + 截图）
 * @param {object | null} position
 * @param {{ boxPriceWad?: bigint | null }} [opts]
 */
const getPlanPresentation = (position, opts = {}) => {
  const detail = getPositionDetail(position)
  if (!position) {
    return {
      ...detail,
      claimable: 0n,
      depositSplit: '—',
      minted: 0n,
      immediate: 0n,
      lockL0: 0n,
      vested: 0n,
      releasedTotal: 0n,
      remainingLock: 0n,
      daily: 0n,
      remainingDaysLabel: '—',
    }
  }
  const immediate = resolveImmediate(position)
  const minted = resolveMinted(position)
  const vested = BigInt(position.vested ?? 0)
  const remainingDays = detail.remainingDays
  return {
    ...detail,
    claimable: getReleaseAmount(position),
    depositSplit: formatDepositSplit(position, opts.boxPriceWad),
    minted,
    immediate,
    lockL0: BigInt(position.lockL0 ?? 0),
    vested,
    /* 累计已释放 = A + V，与进度 (A+V)/D 同口径 */
    releasedTotal: immediate + vested,
    remainingLock: BigInt(position.remainingLock ?? 0),
    daily: BigInt(position.daily ?? 0),
    remainingDaysLabel:
      remainingDays == null ? '—' : remainingDays > 0 ? usdxT('{days} days', { days: remainingDays }) : usdxT('Completed'),
  }
}

module.exports = {
  POSITION_BATCH_SIZE,
  RELEASE_DAYS,
  aggregatePositions,
  chunkMintIds,
  formatDepositSplit,
  formatPlanDate,
  formatReleaseBarWidth,
  getPlanPresentation,
  getPositionDetail,
  getAggregateReleaseProgress,
  getAggregateReleaseBarProgress,
  getReleaseAmount,
  resolveDepositD,
  resolveImmediate,
  resolveMinted,
  sortMintIdsDesc,
}
