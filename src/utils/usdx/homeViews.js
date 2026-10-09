const { formatUnits } = require('viem')
const { usdxT } = require('./usdxI18n')

const ZERO = 0n

const asUserView = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object' && raw.wallet !== undefined) return raw
  return {
    wallet: raw[0],
    claimable: raw[1],
    remainingLock: raw[2],
    unminted: raw[3],
    total: raw[4],
    positionCount: raw[5],
  }
}

const asProtocolView = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object' && raw.Sr !== undefined) return raw
  return {
    U: raw[0],
    B: raw[1],
    P: raw[2],
    Sr: raw[3],
    Etotal: raw[4],
    T: raw[5],
    mode: raw[6],
  }
}

const asMintQuoteView = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object' && raw.boxIn !== undefined) return raw
  return {
    boxIn: raw[0],
    depositD: raw[1],
    immediate: raw[2],
    lockL0: raw[3],
    daily: raw[4],
    mintable: raw[5],
  }
}

const toBig = (value) => {
  if (value === null || value === undefined) return ZERO
  return BigInt(value)
}

const isPriceOk = (proto) => {
  const p = toBig(asProtocolView(proto)?.P)
  return p > ZERO
}

/**
 * BOX 价格说明 Sheet 高亮：链上只能确认价格是否可读，无法区分人工价 / TWAP。
 * @param {boolean | null | undefined} priceOk
 * @returns {'none' | 'neutral'}
 */
const getPriceSheetHighlight = (priceOk) => (priceOk === false ? 'none' : 'neutral')

/**
 * 铸造闸门（权威：pauseMint + quoteMint.mintable；P 仅在尚无报价时兜底）
 * 读链失败 / 加载中 不得当成「已暂停」。
 */
const getMintUnavailableReason = ({
  hasConfig,
  pauseMint,
  pauseConfigLoading,
  pauseConfigError,
  protocolLoading,
  protocolError,
  protocolLoaded,
  priceOk,
  quoteLoading,
  quoteError,
  quoteMintable,
} = {}) => {
  if (!hasConfig) return 'config'
  if (pauseConfigError) return 'rpc'
  if (pauseConfigLoading) return 'loading'
  if (pauseMint === true) return 'pause'
  if (quoteMintable === true) return null
  if (quoteMintable === false) return 'unmintable'
  if (quoteError) return 'quote'
  if (protocolLoading || quoteLoading) return 'loading'
  if (protocolError) return 'rpc'
  if (protocolLoaded && priceOk === false) return 'price'
  return null
}

const getRedeemable = (view) => toBig(asUserView(view)?.wallet)

const getHomeHero = (view) => {
  const normalized = asUserView(view) || {}
  const wallet = toBig(normalized.wallet)
  const claimable = toBig(normalized.claimable)
  const remainingLock = toBig(normalized.remainingLock)
  const total = toBig(normalized.total)
  return {
    total,
    claimable,
    remainingLock,
    wallet,
    redeemable: wallet,
    hasPosition: total > ZERO,
    canClaim: claimable > ZERO,
  }
}

const toDecimal = (value) => Number(formatUnits(toBig(value), 18))

const getProtocolCoverage = (proto) => {
  const normalized = asProtocolView(proto)
  if (!normalized || !isPriceOk(proto)) return { current: null, fullyDiluted: null }
  const sr = toDecimal(normalized.Sr)
  const etotal = toDecimal(normalized.Etotal)
  const t = toDecimal(normalized.T)
  if (!sr || !Number.isFinite(sr) || !Number.isFinite(t)) {
    return { current: null, fullyDiluted: null }
  }
  const current = t / sr
  const denom = sr + etotal
  const fullyDiluted = denom ? t / denom : null
  return { current, fullyDiluted }
}

const toQty = (value) => {
  const n = toDecimal(value)
  return Number.isFinite(n) ? n : 0
}

const getProtocolDashboard = (proto) => {
  const normalized = asProtocolView(proto)
  if (!normalized) {
    return {
      nav: null,
      modeLabel: '—',
      treasury: null,
      supply: null,
      etotal: null,
      fullyDilutedSupply: null,
      coverageCurrent: null,
      coverageFd: null,
      coverTone: '',
      u: null,
      b: null,
      price: null,
    }
  }
  const coverage = getProtocolCoverage(proto)
  const priceOk = isPriceOk(proto)
  const nav = coverage.current
  const sr = toQty(normalized.Sr)
  const etotal = toQty(normalized.Etotal)
  const treasury = priceOk ? toQty(normalized.T) : null
  return {
    nav,
    /* HTML redeemMode：T < Sr → discount，否则 normal；价格不可用才走兜底文案 */
    modeLabel: !priceOk
      ? usdxT('BOX mark price unavailable; redeem by share × 99.5%')
      : treasury !== null && treasury < sr
        ? usdxT('Treasury is below face-value liabilities; redeem at NAV')
        : usdxT('Treasury can redeem 1:1'),
    treasury,
    supply: sr,
    etotal,
    fullyDilutedSupply: sr + etotal,
    coverageCurrent: coverage.current,
    coverageFd: coverage.fullyDiluted,
    coverTone: nav == null ? '' : nav >= 1 ? 'pos' : 'warn',
    u: toQty(normalized.U),
    b: toQty(normalized.B),
    price: priceOk ? toQty(normalized.P) : null,
  }
}

const formatUsdxAmount = (value, dp = 2) => {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'bigint' ? toDecimal(value) : Number(value)
  if (!Number.isFinite(n)) return '—'
  const s = Math.abs(n).toFixed(dp)
  const [intPart, frac] = s.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${n < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`
}

const stripTrailingZeros = (text) => {
  if (!text.includes('.')) return text
  return text.replace(/0+$/, '').replace(/\.$/, '')
}

const WAD = 10n ** 18n
const MIN_4DP_WEI = 10n ** 14n // 0.0001 * 1e18

const formatGroupedInteger = (whole) => whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const formatWeiWithDecimals = (wei, decimals) => {
  const abs = wei < 0n ? -wei : wei
  const whole = abs / WAD
  const frac = abs % WAD
  const fracDigits = (frac * 10n ** BigInt(decimals)) / WAD
  const fracStr = fracDigits.toString().padStart(decimals, '0')
  const sign = wei < 0n ? '-' : ''
  const body = `${formatGroupedInteger(whole)}.${fracStr}`
  return stripTrailingZeros(`${sign}${body}`)
}

const roundWeiToDecimals = (wei, decimals, editable) => {
  const unit = 10n ** BigInt(18 - decimals)
  if (editable) return (wei / unit) * unit
  return ((wei + unit / 2n) / unit) * unit
}

const formatUsdxTradeAmountFromWei = (wei, { editable = false } = {}) => {
  if (wei === 0n) return '0'
  if (wei < 0n) return '—'

  const abs = wei < 0n ? -wei : wei

  if (abs > 100n * WAD) {
    const whole = abs / WAD
    return formatGroupedInteger(wei < 0n ? -whole : whole)
  }

  if (abs >= MIN_4DP_WEI) {
    return formatWeiWithDecimals(roundWeiToDecimals(abs, 4, editable), 4)
  }

  const leadingZeros = (() => {
    let zeros = 0n
    let unit = WAD / 10n
    while (zeros < 18n && abs < unit) {
      zeros += 1n
      unit /= 10n
    }
    return Number(zeros)
  })()
  const decimals = Math.min(8, leadingZeros + 4)
  return formatWeiWithDecimals(roundWeiToDecimals(abs, decimals, editable), decimals)
}

/**
 * 兑换页金额展示，对齐 RN formatTradeAmountAdaptive（packages/utils/number.ts）。
 * n>100 截断整数；0.0001≤n≤100 最多 4 位并去尾零；更小金额最多 8 位。
 */
const formatUsdxTradeAmount = (value, { editable = false } = {}) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'bigint') return formatUsdxTradeAmountFromWei(toBig(value), { editable })
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  if (n < 0) return '—'
  return formatUsdxTradeAmountFromWei(BigInt(Math.trunc(n * 1e18)), { editable })
}

/** 释放/领取：正值且 |x|<0.01 时用 4 位小数，避免早期释放显示成 0.00 */
const formatUsdxReleaseAmount = (value, dp = 2) => {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'bigint' ? toDecimal(value) : Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n !== 0 && Math.abs(n) < 0.01) return formatUsdxAmount(value, 4)
  return formatUsdxAmount(value, dp)
}

/** 活动列表金额：整数不加无意义的小数，小额非整数保留可见精度。 */
const formatUsdxActivityAmount = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'bigint') {
    const wad = 10n ** 18n
    return value % wad === 0n ? formatUsdxAmount(value, 0) : formatUsdxReleaseAmount(value)
  }
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? formatUsdxAmount(n, 0) : formatUsdxReleaseAmount(n)
}

/** 可领取为 0 时与钱包余额同色（.uhs-v.subtle），>0 才用品牌绿 */
const getClaimableStatClass = (value) => (toBig(value) > ZERO ? 'pos' : 'subtle')

/** 可领取展示：大额 0 位 / 常规 2 位 / 早期释放 4 位（对齐 HTML mineClaimable + 小额链上数据） */
const formatUsdxClaimableBadge = (value) => {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'bigint' ? toDecimal(value) : Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n !== 0 && Math.abs(n) < 0.01) return formatUsdxReleaseAmount(value)
  return formatUsdxMoney(value)
}

/** 兑换卖出手续费：0.1% 常为小数，最多 6 位并去掉尾零，避免显示成 0.0000 */
const formatUsdxSwapFeeAmount = (value) => {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'bigint' ? toDecimal(value) : Number(value)
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs === 0) return '0'
  if (abs >= 0.01) return formatUsdxAmount(n, 2)
  return formatUsdxSubCentAmount(n)
}

/** |x|<1 时最多 6 位小数并去尾零（卖出「收到」等需与支付金额区分的场景） */
const formatUsdxSubCentAmount = (value) => {
  const n = typeof value === 'bigint' ? toDecimal(value) : Number(value)
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs === 0) return '0'
  if (abs >= 1) return formatUsdxAmount(n, 2)
  const trimmed = abs
    .toFixed(6)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
  const [intPart, frac] = trimmed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const body = frac ? `${grouped}.${frac}` : grouped
  return n < 0 ? `-${body}` : body
}

/** 金额自适应小数：|x|<100 保留 2 位，避免 0.4/0.8 被四舍五入成 0/1 */
const formatUsdxMoney = (value) => {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'bigint' ? toDecimal(value) : Number(value)
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs < 100) return formatUsdxAmount(n, 2)
  return formatUsdxAmount(n, 0)
}

/** 首页「国库锁仓价值」等带 $ 的展示 */
const formatUsdxUsd = (value) => {
  const s = formatUsdxMoney(value)
  return s === '—' ? '—' : `$${s}`
}

const formatUsdxPct = (value, dp = 2) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(dp)}%`
}

module.exports = {
  asUserView,
  asProtocolView,
  asMintQuoteView,
  isPriceOk,
  getMintUnavailableReason,
  getPriceSheetHighlight,
  getRedeemable,
  getHomeHero,
  getProtocolCoverage,
  getProtocolDashboard,
  formatUsdxAmount,
  formatUsdxTradeAmount,
  formatUsdxReleaseAmount,
  formatUsdxActivityAmount,
  getClaimableStatClass,
  formatUsdxClaimableBadge,
  formatUsdxSwapFeeAmount,
  formatUsdxSubCentAmount,
  formatUsdxMoney,
  formatUsdxUsd,
  formatUsdxPct,
}
