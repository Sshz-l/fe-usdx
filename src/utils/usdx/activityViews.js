const {
  formatUsdxActivityAmount,
  formatUsdxReleaseAmount,
  formatUsdxSwapFeeAmount,
  formatUsdxSubCentAmount,
} = require('./homeViews')
const { getSellPreview, formatHangOrderAmount } = require('./orderViews')
const { usdxT, usdxDateLocale } = require('./usdxI18n')

/** 兑换详情金额：与活动列表一致，保留小额可见精度 */
const formatSwapDetailAmount = (value) => formatUsdxActivityAmount(value)

const ACTIVITY_KIND = {
  0: { tab: 'mint', title: 'Mint', dir: 'in' },
  1: { tab: 'claim', title: 'Claim', dir: 'in' },
  2: { tab: 'redeem', title: 'Redeem', dir: 'out' },
  3: { tab: 'swap', title: 'Sell settled', dir: 'out' },
  4: { tab: 'swap', title: 'Buy USDX', dir: 'in' },
  5: { tab: 'swap', title: 'Sell order', dir: 'out' },
  6: { tab: 'swap', title: 'Cancel order', dir: 'in' },
}

/** 列表/最近动态短标题：与 HTML ACT_META 一致（铸造/领取/赎回/兑换） */
const ACT_SHORT_META = {
  0: { icon: 'pickaxe', title: 'Mint', amountPos: true },
  1: { icon: 'hand-coins', title: 'Claim', amountPos: false },
  2: { icon: 'banknote', title: 'Redeem', amountPos: false },
  3: { icon: 'arrow-left-right', title: 'Swap', amountPos: false },
  4: { icon: 'arrow-left-right', title: 'Swap', amountPos: false },
  5: { icon: 'arrow-left-right', title: 'Swap', amountPos: false },
  6: { icon: 'arrow-left-right', title: 'Swap', amountPos: false },
}

/** @deprecated 使用 ACT_SHORT_META */
const MINE_ACT_META = ACT_SHORT_META

/** 链上 tuple 可能是具名对象，也可能是仅下标数组；统一成具名字段再展示 */
const toActivityBigInt = (value) => {
  if (typeof value === 'bigint') return value
  if (value == null || value === '') return 0n
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

const normalizeActivityRaw = (row) => {
  if (row == null || typeof row !== 'object') {
    return { kind: 0, extra: 0, ts: 0n, mintId: 0n, a0: 0n, a1: 0n, a2: 0n }
  }
  const kind = row.kind ?? row[0]
  const extra = row.extra ?? row[1]
  const ts = row.ts ?? row[2]
  const mintId = row.mintId ?? row[3]
  const a0 = row.a0 ?? row[4]
  const a1 = row.a1 ?? row[5]
  const a2 = row.a2 ?? row[6]
  return {
    kind: Number(kind ?? 0),
    extra: Number(extra ?? 0),
    ts: toActivityBigInt(ts),
    mintId: toActivityBigInt(mintId),
    a0: toActivityBigInt(a0),
    a1: toActivityBigInt(a1),
    a2: toActivityBigInt(a2),
  }
}

/** 活动时间戳合理区间（unix 秒）：排除空槽与错位读出的超大/异常值 */
const MIN_ACTIVITY_TS = 1_600_000_000n // ~2020-09
const MAX_ACTIVITY_TS = 4_102_444_800n // ~2100-01-01
/** ABI 金额字段为 uint128；超出即存储/解码错位 */
const ACTIVITY_UINT128_MAX = (1n << 128n) - 1n

/**
 * 铸造主金额：旧仓位 a2=immediate>0 沿用；现行铸造不立即到账（a2=0），
 * 改展示登记额度 M = 1.2 × D = 1.2 × 2 × usdtIn（USDT/USDX 同为 18 位）。
 */
const mintActivityWei = (row) => {
  const immediate = row.a2 ?? 0n
  if (immediate > 0n) return immediate
  return ((row.a0 ?? 0n) * 12n) / 5n
}

const activityPrimaryWei = (row) => {
  const kind = Number(row.kind)
  if (kind === 0) return mintActivityWei(row)
  if (kind === 3) return row.a0 ?? 0n
  if (kind === 4) return row.a1 ?? 0n
  return row.a0 ?? 0n
}

/**
 * 链上 activitiesOf 偶发返回空槽 / 字段错位记录。
 * 错位常见表现：超大金额（远超 uint128）、主金额为 0、买入 a2≠0。
 */
const isValidActivityRaw = (row) => {
  const normalized = normalizeActivityRaw(row)
  if (normalized.ts < MIN_ACTIVITY_TS || normalized.ts > MAX_ACTIVITY_TS) return false
  const ms = Number(normalized.ts) * 1000
  if (!Number.isFinite(ms) || Number.isNaN(new Date(ms).getTime())) return false
  if (!Object.prototype.hasOwnProperty.call(ACTIVITY_KIND, normalized.kind)) return false
  /* 铸造/领取必须带有效 mintId，否则详情页无法定位仓位 */
  if ((normalized.kind === 0 || normalized.kind === 1) && normalized.mintId === 0n) return false
  if (
    normalized.a0 > ACTIVITY_UINT128_MAX ||
    normalized.a1 > ACTIVITY_UINT128_MAX ||
    normalized.a2 > ACTIVITY_UINT128_MAX
  ) {
    return false
  }
  /* 主展示金额为 0：多为错位（金额落在其它字段），列表会出现无意义的 0.00 */
  if (activityPrimaryWei(normalized) <= 0n) return false
  /* 买入约定 a2=0；非 0 视为脏数据 */
  if (normalized.kind === 4 && normalized.a2 !== 0n) return false
  return true
}

const formatActivityRow = (row) => {
  const normalized = normalizeActivityRaw(row)
  const meta = ACTIVITY_KIND[normalized.kind] || { tab: 'all', title: 'Activity', dir: 'in' }
  const ts = Number(normalized.ts)
  const date =
    ts > 0
      ? new Date(ts * 1000).toLocaleString(usdxDateLocale(), {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'
  let amount = '—'
  if (normalized.kind === 0) amount = `${formatUsdxActivityAmount(mintActivityWei(normalized))} USDX`
  else if (normalized.kind === 1) amount = `${formatUsdxActivityAmount(normalized.a0)} USDX`
  else if (normalized.kind === 2) amount = `${formatUsdxActivityAmount(normalized.a0)} USDX`
  else if (normalized.kind === 3) amount = `${formatUsdxActivityAmount(normalized.a1)} USDT`
  else if (normalized.kind === 4) amount = `${formatUsdxActivityAmount(normalized.a1)} USDX`
  else if (normalized.kind === 5 || normalized.kind === 6) {
    amount = `${formatUsdxActivityAmount(normalized.a0)} USDX`
  }

  return {
    kind: normalized.kind,
    tab: meta.tab,
    title: usdxT(meta.title),
    date,
    amount,
    dir: meta.dir,
    mintId: normalized.mintId,
    extra: normalized.extra,
    ts: normalized.ts,
    a0: normalized.a0,
    a1: normalized.a1,
    a2: normalized.a2,
  }
}

const formatMineActivityDate = (ts) => {
  const n = Number(ts)
  if (!n) return '—'
  const d = new Date(n * 1000)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

const activityListWei = (row) => activityPrimaryWei(row)

const formatActivityListAmount = (row) => {
  const wei = activityListWei(row)
  const abs = formatUsdxReleaseAmount(wei)
  if (abs === '—') return '—'
  /* 0 额不加正负号：避免「+0.00」绿标读成有流入 */
  if (wei === 0n) return abs
  const sign = row.dir === 'out' ? '-' : '+'
  return `${sign}${abs}`
}

/** 仅「流入类且金额 > 0」才标绿；0 额用中性色 */
const resolveActivityAmountPos = (row, metaAmountPos) => {
  if (!metaAmountPos) return false
  return activityListWei(row) > 0n
}

const formatActivityListTime = (ts) => {
  const label = dayLabel(ts)
  const n = Number(ts)
  if (!n) return '—'
  const d = new Date(n * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (label === usdxT('Earlier')) {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${m}-${day}`
  }
  return `${hh}:${mm}`
}

const getActivityShortMeta = (kind) =>
  ACT_SHORT_META[kind] || {
    icon: 'arrow-left-right',
    title: 'Activity',
    amountPos: false,
  }

const getActivityListPresentation = (row) => {
  const meta = getActivityShortMeta(row.kind)
  return {
    icon: meta.icon,
    title: usdxT(meta.title),
    amount: formatActivityListAmount(row),
    amountPos: resolveActivityAmountPos(row, meta.amountPos),
    time: formatActivityListTime(row.ts),
  }
}

const getMineActivityPresentation = (row) => {
  const meta = getActivityShortMeta(row.kind)
  return {
    icon: meta.icon,
    title: usdxT(meta.title),
    amount: formatActivityListAmount(row),
    amountPos: resolveActivityAmountPos(row, meta.amountPos),
    date: formatMineActivityDate(row.ts),
  }
}


const mapActivities = (list) =>
  (Array.isArray(list) ? list : []).filter(isValidActivityRaw).map(formatActivityRow)

const getActivityListState = ({ loading, error, count, awaitingMore = false }) => {
  if (loading || awaitingMore) return 'loading'
  if (error) return 'error'
  if (count === 0) return 'empty'
  return 'ready'
}

const dayLabel = (ts) => {
  const n = Number(ts)
  if (!n) return usdxT('Earlier')
  const date = new Date(n * 1000)
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((startToday - startThat) / 86400000)
  if (diff === 0) return usdxT('Today')
  if (diff === 1) return usdxT('Yesterday')
  return usdxT('Earlier')
}

const groupActivitiesByDate = (items) => {
  const groups = []
  for (const item of items || []) {
    const label = dayLabel(item.ts)
    const last = groups[groups.length - 1]
    if (!last || last.label !== label) groups.push({ label, items: [item] })
    else last.items.push(item)
  }
  return groups
}

const formatActivityDateTime = (ts) => {
  const n = Number(ts)
  if (!n) return '—'
  const d = new Date(n * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

/** 兑换详情方向副标题：与 HTML renderSwapDetailPage 一致 */
const buildSwapDirLabel = (shortDir, paySym, recvSym) =>
  usdxT('{dir} · {pay} → {recv}', { dir: shortDir, pay: paySym, recv: recvSym })

const sellFeeUsdx = (amount) => (BigInt(amount ?? 0) * 10n) / 10000n

/** 卖出详情「收到」：手续费低于 0.01 USDX 时用更高精度，避免与支付金额看起来相同 */
const FINE_FEE_THRESHOLD = 10n ** 16n

const formatSwapDetailSellRecvLabel = (payAmount, recvAmount) => {
  const fee = sellFeeUsdx(payAmount)
  const formatted =
    fee > 0n && fee < FINE_FEE_THRESHOLD
      ? formatUsdxSubCentAmount(recvAmount)
      : formatSwapDetailAmount(recvAmount)
  return `${formatted} USDT`
}

const formatSellFeeLabel = (amount) => {
  const fee = sellFeeUsdx(amount)
  return fee > 0n ? `${formatUsdxSwapFeeAmount(fee)} USDX` : usdxT('Free')
}

const formatSellFeeUsdtLabel = (feeUsdt) =>
  BigInt(feeUsdt ?? 0) > 0n ? `${formatSwapDetailAmount(feeUsdt)} USDT` : usdxT('Free')

/** kind 5 详情：用 sellOrder + quoteOrder 覆盖活动流水里的「提交挂单」快照 */
const applyQueuedSellOrderStatus = (detail, { status, remaining, amount, grossClaimable } = {}) => {
  const code = Number(status)
  const filled =
    amount != null && remaining != null
      ? (() => {
          const amt = BigInt(amount)
          const rem = BigInt(remaining)
          const f = amt - rem
          return f > 0n ? f : 0n
        })()
      : null
  const withFilled = (next) =>
    next.status === usdxT('Open') && filled != null
      ? { ...next, filledLabel: `${formatHangOrderAmount(filled)} USDX` }
      : { ...next, filledLabel: null }

  if (code === 1) {
    if (remaining == null && grossClaimable == null) {
      return withFilled({
        ...detail,
        dir: usdxT('Sell USDX'),
        dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
        status: usdxT('Open'),
        statusCls: 'queued',
        canCancel: true,
        canClaim: false,
      })
    }
    const rem = BigInt(remaining ?? 0)
    const claimable = BigInt(grossClaimable ?? 0)
    if (rem > 0n) {
      return withFilled({
        ...detail,
        dir: usdxT('Sell USDX'),
        dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
        status: usdxT('Open'),
        statusCls: 'queued',
        canCancel: true,
        canClaim: false,
      })
    }
    if (claimable > 0n) {
      return {
        ...detail,
        dir: usdxT('Sell settled'),
        dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
        status: usdxT('Claimable'),
        statusCls: 'done',
        canCancel: false,
        canClaim: true,
        filledLabel: null,
      }
    }
    return {
      ...detail,
      dir: usdxT('Sell settled'),
      dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
      status: usdxT('Filled'),
      statusCls: 'done',
      canCancel: false,
      canClaim: false,
      filledLabel: null,
    }
  }
  if (code === 2) {
    return {
      ...detail,
      dir: usdxT('Sell USDX'),
      dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
      status: usdxT('Cancelled'),
      statusCls: 'cancelled',
      recvLabel: '—',
      feeLabel: '—',
      canCancel: false,
      canClaim: false,
      filledLabel: null,
    }
  }
  return { ...detail, filledLabel: null }
}

/** 排队卖单：有 orderFilledAt 用成交时间，否则保持活动记录原时间 */
const resolveSwapDetailTimeLabel = (row, filledAt) => {
  const kind = Number(row.kind)
  const queuedOrderId = BigInt(row.mintId ?? 0)
  const hasQueuedOrder = (kind === 3 || kind === 5) && queuedOrderId > 0n
  if (hasQueuedOrder && BigInt(filledAt ?? 0) > 0n) return formatActivityDateTime(filledAt)
  return formatActivityDateTime(row.ts)
}

const getSwapActivityDetail = (
  row,
  { orderStatus, orderRemaining, orderAmount, grossClaimable, filledAt } = {}
) => {
  if (!row) return null
  const kind = Number(row.kind)
  const timeLabel = resolveSwapDetailTimeLabel(row, filledAt)
  if (kind === 4) {
    return {
      dir: usdxT('Buy USDX'),
      dirLabel: buildSwapDirLabel(usdxT('Buy'), 'USDT', 'USDX'),
      status: usdxT('Completed'),
      statusCls: 'done',
      timeLabel,
      payLabel: `${formatSwapDetailAmount(row.a0)} USDT`,
      recvLabel: `${formatSwapDetailAmount(row.a1)} USDX`,
      feeLabel: usdxT('Free'),
      orderId: null,
      canCancel: false,
      canClaim: false,
      filledLabel: null,
    }
  }
  if (kind === 3) {
    const gross = BigInt(row.a0 ?? 0)
    const net = BigInt(row.a1 ?? 0)
    const fee = BigInt(row.a2 ?? 0)
    const isInstant = (row.mintId ?? 0n) === 0n
    return {
      dir: isInstant ? usdxT('Sell USDX') : usdxT('Sell settled'),
      dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
      status: usdxT('Completed'),
      statusCls: 'done',
      timeLabel,
      /* 文档 kind 3：a0=gross USDX、a1=net USDT、a2=fee USDT；支付只用 a0，勿再加 fee */
      payLabel: `${formatSwapDetailAmount(gross)} USDX`,
      recvLabel: `${formatSwapDetailAmount(net)} USDT`,
      feeLabel: formatSellFeeUsdtLabel(fee),
      orderId: isInstant ? null : row.mintId ?? null,
      canCancel: false,
      canClaim: false,
      filledLabel: null,
    }
  }
  if (kind === 5) {
    const { usdtOut } = getSellPreview(row.a0)
    const base = {
      dir: usdxT('Sell USDX'),
      dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
      status: usdxT('Open'),
      statusCls: 'queued',
      timeLabel,
      payLabel: `${formatSwapDetailAmount(row.a0)} USDX`,
      recvLabel: formatSwapDetailSellRecvLabel(row.a0, usdtOut),
      feeLabel: formatSellFeeLabel(row.a0),
      orderId: row.mintId ?? null,
      canCancel: false,
      canClaim: false,
      filledLabel: null,
    }
    if (orderStatus == null) return base
    return applyQueuedSellOrderStatus(base, {
      status: orderStatus,
      remaining: orderRemaining,
      amount: orderAmount ?? row.a0,
      grossClaimable,
    })
  }
  if (kind === 6) {
    return {
      dir: usdxT('Sell USDX'),
      dirLabel: buildSwapDirLabel(usdxT('Sell'), 'USDX', 'USDT'),
      status: usdxT('Cancelled'),
      statusCls: 'cancelled',
      timeLabel,
      payLabel: `${formatSwapDetailAmount(row.a0)} USDX`,
      recvLabel: '—',
      feeLabel: '—',
      orderId: row.mintId ?? null,
      canCancel: false,
      canClaim: false,
      filledLabel: null,
    }
  }
  return null
}

/** 兑换详情字段序：支付下方插入已成交（仅挂单中）；抽屉与全屏共用 */
const buildSwapDetailInfoRows = (detail, priceLabel) => {
  if (!detail) return []
  const rows = [
    [usdxT('Time'), detail.timeLabel],
    [usdxT('Pay'), detail.payLabel],
  ]
  if (detail.filledLabel) rows.push([usdxT('Filled amount'), detail.filledLabel])
  rows.push([usdxT('Receive'), detail.recvLabel], [usdxT('Fee'), detail.feeLabel], [usdxT('Price'), priceLabel])
  return rows
}

const SWAP_DETAIL_KINDS = new Set([3, 4, 5, 6])

const getSwapDetailRouteKey = (row) => ({
  kind: Number(row.kind),
  mintId: BigInt(row.mintId ?? 0),
  ts: BigInt(row.ts ?? 0),
  a0: BigInt(row.a0 ?? 0),
  a1: BigInt(row.a1 ?? 0),
})

const formatActivityRowFromRouteKey = (key) => {
  if (!key || !SWAP_DETAIL_KINDS.has(key.kind)) return null
  return formatActivityRow({
    kind: key.kind,
    mintId: key.mintId,
    ts: key.ts,
    a0: key.a0,
    a1: key.a1,
    a2: 0n,
    extra: 0,
  })
}

module.exports = {
  ACTIVITY_KIND,
  ACT_SHORT_META,
  MINE_ACT_META,
  normalizeActivityRaw,
  isValidActivityRaw,
  formatActivityRow,
  formatActivityRowFromRouteKey,
  getSwapDetailRouteKey,
  formatActivityDateTime,
  formatActivityListAmount,
  formatActivityListTime,
  getActivityListPresentation,
  getActivityListState,
  getMineActivityPresentation,
  resolveSwapDetailTimeLabel,
  getSwapActivityDetail,
  buildSwapDetailInfoRows,
  applyQueuedSellOrderStatus,
  groupActivitiesByDate,
  mapActivities,
}
