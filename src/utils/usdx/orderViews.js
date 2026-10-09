const ORDER_PAGE_SIZE = 20
const SELL_FEE_BPS = 10n
const BPS_DENOMINATOR = 10000n

const { formatUsdxAmount } = require('./homeViews')
const { SWAP_RECV_DISPLAY_DP } = require('./swapQuote')
const { usdxT } = require('./usdxI18n')

/** IUsdxStabilizer: 0=none, 1=open, 2=cancelled */
const ORDER_STATUS = {
  1: { key: 'open', label: 'Open', cls: 'queued' },
  2: { key: 'cancelled', label: 'Cancelled', cls: 'cancelled' },
}

const ORDER_OPEN_FILLED = { key: 'filled', label: 'Filled', cls: 'done' }
const ORDER_CLAIMABLE = { key: 'claimable', label: 'Claimable', cls: 'done' }

const createOrderPagination = () => ({
  items: [],
  loadedRaw: 0n,
  total: 0n,
  hasMore: false,
})

const appendOrderPage = (state, page, totalValue) => {
  const rawPage = Array.isArray(page) ? page : []
  const total = BigInt(totalValue ?? 0)
  const loadedRaw = BigInt(state.loadedRaw) + BigInt(rawPage.length)
  return {
    items: [...state.items, ...rawPage],
    loadedRaw,
    total,
    hasMore: loadedRaw < total,
  }
}

const getSellOrderRemaining = (order) =>
  BigInt(order?.remaining == null ? order?.amount ?? 0 : order.remaining)

/** 常规取消：status==1 且仍有未成交剩余 */
const canCancelSellOrder = (order) =>
  Number(order?.status) === 1 && getSellOrderRemaining(order) > 0n

/** quoteOrder.grossClaimable > 0 时可领取 USDT */
const canClaimSellOrder = (order, grossClaimable) =>
  Number(order?.status) === 1 &&
  getSellOrderRemaining(order) === 0n &&
  BigInt(grossClaimable ?? 0) > 0n

/** 排队卖单全量成交待领取：refund=0 且仍有待领，且 orderFilledAt 已记录 */
const isFullyFilledPendingClaim = ({ refundClaimable, grossClaimable, filledAt } = {}) =>
  BigInt(refundClaimable ?? 0) === 0n &&
  BigInt(grossClaimable ?? 0) > 0n &&
  BigInt(filledAt ?? 0) > 0n

/**
 * 解码 sellOrder / activeSellOrdersOf / sellOrdersOf 返回值（IUsdxStabilizer facet）。
 * sellOrder(id)              → (user, amount, remaining, createdAt, start, status)
 * activeSellOrdersOf(...)    → (orderId, user, amount, remaining, createdAt, start, status)
 * sellOrdersOf(...)          → 同上（历史）
 */
const asSellOrderView = (raw, orderId) => {
  if (raw == null) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const hasOrderId = raw.orderId != null
    const createdAt = raw.createdAt ?? raw.createAt ?? 0
    return {
      orderId: BigInt(hasOrderId ? raw.orderId : orderId ?? 0),
      user: raw.user ?? '0x0000000000000000000000000000000000000000',
      amount: BigInt(raw.amount ?? 0),
      remaining: BigInt(raw.remaining ?? raw.amount ?? 0),
      createAt: BigInt(createdAt),
      start: BigInt(raw.start ?? 0),
      status: Number(raw.status ?? 0),
    }
  }
  const row = raw
  if (row.length >= 7) {
    return {
      orderId: BigInt(row[0]),
      user: row[1] ?? '0x0000000000000000000000000000000000000000',
      amount: BigInt(row[2]),
      remaining: BigInt(row[3]),
      createAt: BigInt(row[4]),
      start: BigInt(row[5]),
      status: Number(row[6]),
    }
  }
  if (row.length >= 6) {
    return {
      orderId: BigInt(orderId ?? 0),
      user: row[0] ?? '0x0000000000000000000000000000000000000000',
      amount: BigInt(row[1]),
      remaining: BigInt(row[2]),
      createAt: BigInt(row[3]),
      start: BigInt(row[4]),
      status: Number(row[5]),
    }
  }
  if (row.length >= 5) {
    return {
      orderId: BigInt(orderId ?? 0),
      user: row[0] ?? '0x0000000000000000000000000000000000000000',
      amount: BigInt(row[1]),
      remaining: BigInt(row[2]),
      createAt: BigInt(row[3]),
      status: Number(row[4]),
      start: 0n,
    }
  }
  return null
}

const sumQueuedRemaining = (orders) =>
  orders
    .filter((order) => canCancelSellOrder(order))
    .reduce((sum, order) => sum + getSellOrderRemaining(order), 0n)

/** 设计稿 swapLiqQueueAll：usdxInventory() + openQueueOrderCount() */
const formatGlobalSellQueueAmountText = (amountWei) =>
  formatUsdxAmount(amountWei, SWAP_RECV_DISPLAY_DP)

/** 挂单抽屉/已成交：固定 2 位小数，避免 2.5 被 0 位四舍五入成 3 */
const formatHangOrderAmount = (value) => formatUsdxAmount(value, SWAP_RECV_DISPLAY_DP)

const formatGlobalSellQueueText = ({
  amountWei,
  count,
  amountLoading,
  countLoading,
} = {}) => {
  if (amountLoading || countLoading) return '—'
  if (amountWei == null || count == null) return '—'
  const amount = BigInt(amountWei)
  const amountText = formatGlobalSellQueueAmountText(amount)
  return usdxT('{amount} USDX · {count} orders', { amount: amountText, count })
}

/** 「我的挂单」只展示未成交挂单；全单成交 / 已取消进活动流水，不留在抽屉 */
const filterOpenHangOrders = (orders) =>
  (Array.isArray(orders) ? orders : []).filter((order) => canCancelSellOrder(order))

const getSellOrdersPresentation = (orders) => {
  const history = Array.isArray(orders) ? orders : []
  const queuedOrders = filterOpenHangOrders(history)
  return {
    hasHistory: history.length > 0,
    queuedOrders,
    queuedCount: queuedOrders.length,
    queuedAmount: sumQueuedRemaining(queuedOrders),
  }
}

const getSellOrderStatus = (order) => {
  const view = asSellOrderView(order)
  return view ? view.status : null
}

const getCancelSellSuccessMessage = (status, { claimedUsdt } = {}) => {
  if (claimedUsdt) return usdxT('USDT claimed')
  const code = Number(status)
  if (code === 2) return usdxT('Order cancelled')
  return usdxT('Done')
}

/** C28：已成交 = 挂单原量 − remaining（含 filled=0） */
const getSellOrderFilled = (order) => {
  const view = asSellOrderView(order) || order
  const amount = BigInt(view?.amount ?? 0)
  const remaining = getSellOrderRemaining(view)
  const filled = amount - remaining
  return filled > 0n ? filled : 0n
}

const mapSellOrder = (order, { grossClaimable } = {}) => {
  const view = asSellOrderView(order)
  if (!view) {
    return {
      orderId: 0n,
      amount: 0n,
      remaining: 0n,
      filled: 0n,
      displayAmount: 0n,
      createAt: 0n,
      status: 0,
      key: 'unknown',
      label: '—',
      cls: '',
      canCancel: false,
      canClaim: false,
    }
  }
  const status = Number(view.status)
  const remaining = getSellOrderRemaining(view)
  const filled = getSellOrderFilled(view)
  let meta = ORDER_STATUS[status] || { key: 'unknown', label: '—', cls: '' }
  if (status === 1 && remaining === 0n) {
    meta =
      grossClaimable != null && BigInt(grossClaimable) > 0n ? ORDER_CLAIMABLE : ORDER_OPEN_FILLED
  }
  if (meta.label && meta.label !== '—') {
    meta = { ...meta, label: usdxT(meta.label) }
  }
  return {
    orderId: view.orderId,
    amount: view.amount,
    remaining,
    filled,
    displayAmount: view.amount,
    createAt: view.createAt,
    status,
    ...meta,
    canCancel: canCancelSellOrder(view),
    canClaim: canClaimSellOrder(view, grossClaimable),
  }
}

/** 本地 fallback：链上 quoteSellUsdx 不可用时的 10 bps 估算 */
const getSellPreview = (amount) => {
  const amt = BigInt(amount ?? 0)
  const usdtOut = amt - (amt * SELL_FEE_BPS) / BPS_DENOMINATOR
  return {
    feeBps: SELL_FEE_BPS,
    usdtOut,
    cta: usdxT('Submit order'),
  }
}

const formatSellInstantSuccessMessage = (netUsdt) => {
  const label = formatUsdxAmount(BigInt(netUsdt ?? 0), SWAP_RECV_DISPLAY_DP)
  return usdxT('Swap successful, received {amount} USDT', { amount: label })
}

/** 提交挂单成功提示：展示扣费后预计兑付 USDT */
const formatSellQueueSuccessMessage = (amount) => {
  const { usdtOut } = getSellPreview(amount)
  const label = formatUsdxAmount(usdtOut, SWAP_RECV_DISPLAY_DP)
  return usdxT('Order placed, will settle {amount} USDT', { amount: label })
}

const formatSellSuccessMessage = ({ instant, netUsdt, amount }) => {
  if (instant) return formatSellInstantSuccessMessage(netUsdt ?? getSellPreview(amount).usdtOut)
  return formatSellQueueSuccessMessage(amount)
}

/** C29：instant → sellInstant（无挂单）；否则 sell（始终入队） */
const resolveSellWriteName = (instant) => (instant === true ? 'sellInstant' : 'sell')

/** C29：即时「兑换」/ 挂单「提交挂单」；loading 文案区分 */
const getSellCtaLabel = ({ instant, submitting, loading } = {}) => {
  if (submitting) return instant === true ? usdxT('Processing…') : usdxT('Submitting…')
  if (loading) return usdxT('Quoting…')
  return instant === true ? usdxT('Swap') : usdxT('Submit order')
}

/**
 * C29：sellInstant 无 orderId（用 0n 标记）；sell 返回 ≥1。
 * 未知 orderId 时回退 quote.instant。
 */
const isSellInstantFill = (orderId, quoteInstant) => {
  if (orderId === 0n) return true
  if (orderId != null && orderId > 0n) return false
  return quoteInstant === true
}

/** C29：仅排队 sell（orderId>0）才刷新 activeSellOrdersOf；sellInstant 无挂单 */
const shouldRefreshActiveSellOrders = (orderId) =>
  orderId != null && BigInt(orderId) > 0n

const getStabilizerWriteGate = ({ paused } = {}) => ({
  buy: paused !== true,
  sell: paused !== true,
  cancel: true,
})

module.exports = {
  ORDER_PAGE_SIZE,
  isSellInstantFill,
  shouldRefreshActiveSellOrders,
  ORDER_STATUS,
  appendOrderPage,
  asSellOrderView,
  canCancelSellOrder,
  canClaimSellOrder,
  isFullyFilledPendingClaim,
  filterOpenHangOrders,
  createOrderPagination,
  getSellOrderFilled,
  formatGlobalSellQueueText,
  formatSellInstantSuccessMessage,
  formatSellQueueSuccessMessage,
  formatSellSuccessMessage,
  getCancelSellSuccessMessage,
  getSellCtaLabel,
  getSellOrderStatus,
  getSellOrdersPresentation,
  getSellPreview,
  getStabilizerWriteGate,
  formatHangOrderAmount,
  mapSellOrder,
  resolveSellWriteName,
  sumQueuedRemaining,
}
