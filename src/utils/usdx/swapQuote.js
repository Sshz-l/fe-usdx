const { parseTokenAmount } = require('./amounts')
const { formatUsdxAmount } = require('./homeViews')
const { usdxT } = require('./usdxI18n')

const SWAP_FEE_IN = 0n
/** 卖出挂单本地预览按到期最低 0.1% 估算；即时成交固定 0.5% */
const SWAP_FEE_OUT = 10n
const SWAP_FEE_OUT_INSTANT = 50n
const BPS_DENOMINATOR = 10000n
/** C29：卖出挂单 0.5%→0.1% 衰减；即时成交固定 0.5% */
const SWAP_SELL_FEE_RANGE_LABEL = '0.1%-0.5%'
const SWAP_SELL_INSTANT_FEE_LABEL = '0.5%'
/** IUsdxStabilizer：sell(amount) 最低 1 USDX；buyUSDX 最低 0.01 */
const STABILIZER_MIN_SELL_WEI = 10n ** 18n
const STABILIZER_MIN_BUY_WEI = 10n ** 16n

const getSwapSellFeeLabel = (instant) =>
  instant === true ? SWAP_SELL_INSTANT_FEE_LABEL : SWAP_SELL_FEE_RANGE_LABEL

const formatSwapFeeLabel = (feeBps, { instant } = {}) => {
  if (feeBps === 0n) return usdxT('Free')
  return getSwapSellFeeLabel(instant)
}

/**
 * 对齐 HTML renderSwap：
 * - 收到卡：fmtNum(got) → 固定 2 位
 * - 至少收到：fmtNum(got, 4) + 币种 → 固定 4 位
 */
const SWAP_RECV_DISPLAY_DP = 2
const SWAP_MIN_RECV_DP = 4
/** 兑换详情 / 更多信息价格行（HTML 写死 1:1 展示） */
const SWAP_PRICE_LABEL = '1 USDX = 1.0000 USDT'
/** 卖出方向「兑付方式」固定文案（HTML #swapModeRow） */
const SWAP_SELL_MODE_LABEL = 'Open order (FIFO, not instant)'

const asSellQuoteView = (raw) => {
  if (raw == null) return { instant: false, netUsdt: null }
  if (typeof raw === 'object' && raw.instant !== undefined) {
    const net = raw.netUsdt ?? raw[1]
    return {
      instant: raw.instant === true,
      netUsdt: net == null ? null : BigInt(net),
    }
  }
  const net = raw[1]
  return {
    instant: raw[0] === true,
    netUsdt: net == null ? null : BigInt(net),
  }
}

const quoteSwapPreview = (dir, amount, payBalance) => {
  const isSell = dir === 'X2U'
  const pay = isSell ? 'USDX' : 'USDT'
  const recv = isSell ? 'USDT' : 'USDX'
  const feeBps = isSell ? SWAP_FEE_OUT : SWAP_FEE_IN
  const parsed = parseTokenAmount(amount)
  const amt = parsed.ok ? parsed.amount : 0n
  const got = amt - (amt * feeBps) / BPS_DENOMINATOR
  const balanceKnown = typeof payBalance === 'bigint'
  const over = amt > 0n && balanceKnown && amt > payBalance
  return {
    pay,
    recv,
    feeBps,
    valid: parsed.ok,
    amt,
    got,
    feeLabel: formatSwapFeeLabel(feeBps),
    cta: isSell ? usdxT('Submit order') : usdxT('Swap'),
    isSell,
    balanceKnown,
    over,
    canSubmit: amt > 0n && balanceKnown && amt <= payBalance,
  }
}

/** 支付侧限额：钱包余额不足 / 买入时稳定器 inventory+pool 可兑不足 */
const getSwapPayLimitMessage = (quote, { payBalanceWei, inventoryWei, poolWei, isBuy }) => {
  const { pay, recv, amt, over } = quote
  if (amt <= 0n) return ''
  if (over && typeof payBalanceWei === 'bigint') {
    return usdxT('Insufficient {token} balance, max {amount}', {
      token: pay,
      amount: formatUsdxAmount(payBalanceWei, SWAP_RECV_DISPLAY_DP),
    })
  }
  if (isBuy) {
    const inv = typeof inventoryWei === 'bigint' ? inventoryWei : 0n
    const pool = typeof poolWei === 'bigint' ? poolWei : 0n
    const buyCap = inv + pool
    if (typeof inventoryWei === 'bigint' || typeof poolWei === 'bigint') {
      if (amt > buyCap) {
        return usdxT('Insufficient {token} liquidity, max {amount}', {
          token: recv,
          amount: formatUsdxAmount(buyCap, SWAP_RECV_DISPLAY_DP),
        })
      }
    }
  }
  return ''
}

const sumBuyLiquidity = (inventoryWei, poolWei) => {
  const inv = typeof inventoryWei === 'bigint' ? inventoryWei : 0n
  const pool = typeof poolWei === 'bigint' ? poolWei : 0n
  return inv + pool
}

const isBelowStabilizerMinSell = (amountWei) => {
  const amt = BigInt(amountWei ?? 0)
  return amt > 0n && amt < STABILIZER_MIN_SELL_WEI
}

const isBelowStabilizerMinBuy = (amountWei) => {
  const amt = BigInt(amountWei ?? 0)
  return amt > 0n && amt < STABILIZER_MIN_BUY_WEI
}

/** 链上 netUsdt=0（如低于最低额）时回退本地扣费估算 */
const resolveSellRecvWei = (netUsdt, localGot) => {
  if (netUsdt != null && netUsdt > 0n) return netUsdt
  return BigInt(localGot ?? 0)
}

const getSellMinOrderMessage = () => usdxT('Minimum sell is 1 USDX')
const getBuyMinOrderMessage = () => usdxT('Minimum buy is 0.01 USDT')

/** 防抖后的 quote 是否与当前输入金额一致（按 wei 比较，忽略格式差异） */
const isSellQuoteAmountSynced = (payWei, quoteAmountWei) =>
  typeof payWei === 'bigint' && typeof quoteAmountWei === 'bigint' && payWei > 0n && payWei === quoteAmountWei

/** 链上 quote 未就绪时，用稳定器 USDT 储备粗估是否即时兑付 */
const predictSellInstantFromReserve = (payWei, reserveWei) => {
  if (typeof payWei !== 'bigint' || payWei <= 0n) return false
  if (typeof reserveWei !== 'bigint') return false
  return payWei <= reserveWei
}

/**
 * C29 / wiki 2026-09-17：只信 quoteSellUsdx.instant（直兑可先结 FIFO 再吃 leftover）。
 * 报价未对齐时：有全局挂单则保守非即时；否则用储备粗估。
 */
const resolveSellInstantHint = ({
  quoteSynced,
  quoteInstant,
  payWei,
  reserveWei,
  queueCount,
} = {}) => {
  if (quoteSynced) return quoteInstant === true
  if (typeof queueCount === 'number' && queueCount > 0) return false
  return predictSellInstantFromReserve(payWei, reserveWei)
}

const previewSellRecvWei = (amountWei, instant) => {
  const amt = BigInt(amountWei ?? 0)
  const bps = instant ? SWAP_FEE_OUT_INSTANT : SWAP_FEE_OUT
  return amt - (amt * bps) / BPS_DENOMINATOR
}

/** 即时：链上/0.5% 净额；挂单：至少收到取排队最差 0.5%，不能用到期 0.1% */
const resolveSellMinRecvWei = ({ instant, netUsdt, amountWei } = {}) => {
  const amt = BigInt(amountWei ?? 0)
  if (instant === true) return resolveSellRecvWei(netUsdt, previewSellRecvWei(amt, true))
  return previewSellRecvWei(amt, true)
}

const getSellSettlementLabel = ({
  loading,
  instant,
  belowMin,
} = {}) => {
  if (loading) return usdxT('Loading…')
  if (belowMin) return '—'
  if (instant) return usdxT('Instant')
  // 设计稿 usdx-stablecoin.html #swapModeRow：挂单（FIFO，非即时）
  return usdxT('Open order (FIFO, not instant)')
}

/** 兑换「收到」：HTML fmtNum(got)，固定 2 位小数。 */
const formatSwapRecvAmount = (recvWei) => {
  if (recvWei == null) return '—'
  return formatUsdxAmount(recvWei, SWAP_RECV_DISPLAY_DP)
}

/** 更多信息「至少收到」：HTML fmtNum(got, 4) + 币种，固定 4 位小数。 */
const formatSwapMinRecvLabel = (recvWei, recvSym) => {
  if (recvWei == null) return '—'
  const sym = recvSym ? ` ${recvSym}` : ''
  return `${formatUsdxAmount(recvWei, SWAP_MIN_RECV_DP)}${sym}`
}

const formatSwapBuySuccessMessage = (amount) => {
  const amt = BigInt(amount ?? 0)
  const got = amt - (amt * SWAP_FEE_IN) / BPS_DENOMINATOR
  const label = formatUsdxAmount(got, SWAP_RECV_DISPLAY_DP)
  return usdxT('Swap successful, received {amount} USDX', { amount: label })
}

module.exports = {
  SWAP_FEE_IN,
  SWAP_FEE_OUT,
  SWAP_FEE_OUT_INSTANT,
  SWAP_RECV_DISPLAY_DP,
  SWAP_MIN_RECV_DP,
  SWAP_PRICE_LABEL,
  SWAP_SELL_MODE_LABEL,
  SWAP_SELL_FEE_RANGE_LABEL,
  SWAP_SELL_INSTANT_FEE_LABEL,
  STABILIZER_MIN_SELL_WEI,
  STABILIZER_MIN_BUY_WEI,
  asSellQuoteView,
  formatSwapFeeLabel,
  formatSwapBuySuccessMessage,
  formatSwapMinRecvLabel,
  formatSwapRecvAmount,
  getBuyMinOrderMessage,
  getSellMinOrderMessage,
  getSellSettlementLabel,
  getSwapPayLimitMessage,
  getSwapSellFeeLabel,
  isBelowStabilizerMinBuy,
  isBelowStabilizerMinSell,
  isSellQuoteAmountSynced,
  predictSellInstantFromReserve,
  previewSellRecvWei,
  quoteSwapPreview,
  resolveSellInstantHint,
  resolveSellMinRecvWei,
  resolveSellRecvWei,
  sumBuyLiquidity,
}
