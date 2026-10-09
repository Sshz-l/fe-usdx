const WAD = 10n ** 18n
/** 赎回费 0.5% → 用户到手比例 99.5%（与 HTML FEE_REDEEM / 合约一致） */
const FEE_REMAIN_BPS = 9950n
const BPS = 10000n

const { formatUsdxAmount } = require('./homeViews')
const { usdxT } = require('./usdxI18n')

/**
 * HTML MODE_TEXT（设计稿常量；产品页三态差异主要靠总价值显隐 + 数量，
 * ribbon 文案与走查按钮「正常赎回（覆盖…）」不同）。
 */
const REDEEM_MODE = {
  0: {
    key: 'normal',
    cls: 'ok-tone',
    icon: 'shield-check',
    html: '<b>Redeemed at face value</b>, 1 USDX counts as 1 USDT.',
  },
  1: {
    key: 'discount',
    cls: 'danger-tone',
    icon: 'alert-triangle',
    html: 'Treasury is below face value, <b>redeem pro rata at NAV</b>',
  },
  2: {
    key: 'fallback',
    cls: 'danger-tone',
    icon: 'cloud-off',
    html: '<b>BOX mark price unavailable</b>; paid by share × 99.5%. Redeeming is <b>not paused</b>.',
  },
}

const asRedeemQuote = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object' && !Array.isArray(raw) && raw.usdtOut !== undefined) {
    return {
      mode: Number(raw.mode),
      usdtOut: BigInt(raw.usdtOut),
      boxOut: BigInt(raw.boxOut),
      feeUsdt: BigInt(raw.feeUsdt ?? 0),
      feeBox: BigInt(raw.feeBox ?? 0),
      dWad: BigInt(raw.dWad ?? 0),
      valueAvailable: Boolean(raw.valueAvailable),
    }
  }
  return {
    mode: Number(raw[0]),
    usdtOut: BigInt(raw[1]),
    boxOut: BigInt(raw[2]),
    feeUsdt: BigInt(raw[3] ?? 0),
    feeBox: BigInt(raw[4] ?? 0),
    dWad: BigInt(raw[5] ?? 0),
    valueAvailable: Boolean(raw[6]),
  }
}

/**
 * HTML redeemQuote.value：
 * - normal:  q · (1 − 0.5%)
 * - discount: (1 − 0.5%) · d² · q
 * - fallback / 无价: null（不做估值）
 * dWad 是折价系数，不是合计价值。
 */
const getRedeemTotalValue = (amount, quote) => {
  if (!quote || !quote.valueAvailable) return null
  const mode = Number(quote.mode)
  if (mode === 2) return null
  const amt = BigInt(amount ?? 0)
  if (amt <= 0n) return null
  if (mode === 0) return (amt * FEE_REMAIN_BPS) / BPS
  const d = BigInt(quote.dWad ?? 0)
  if (d <= 0n) return null
  return (amt * d * d * FEE_REMAIN_BPS) / (WAD * WAD * BPS)
}

/**
 * @param {unknown} raw quoteRedeem 结果
 * @param {{ amount?: bigint, priceOk?: boolean }} [opts]
 *   amount：赎回数量（算合计价值）
 *   priceOk：金额为 0 / 尚无报价时，用协议价可用性决定合计行与 hint（对齐 HTML hasPrice）
 */
const getRedeemDisplay = (raw, opts = {}) => {
  const amount = BigInt(opts.amount ?? 0)
  const priceOk = opts.priceOk !== false
  const quote = asRedeemQuote(raw)
  const modeIdx = quote ? quote.mode : priceOk ? 0 : 2
  const mode = REDEEM_MODE[modeIdx] || REDEEM_MODE[0]
  const usdtOut = quote?.usdtOut ?? 0n
  const boxOut = quote?.boxOut ?? 0n
  const hasPrice = quote ? Boolean(quote.valueAvailable) && mode.key !== 'fallback' : priceOk
  const totalValue = getRedeemTotalValue(amount, quote)

  return {
    modeKey: mode.key,
    modeCls: mode.cls,
    modeIcon: mode.icon,
    modeHtml: usdxT(mode.html),
    showTotalValue: hasPrice,
    showNoPriceHint: !hasPrice,
    totalValue,
    feeLabel: usdxT('Redeem fee'),
    feeText: '0.5%',
    rows: [
      { sym: 'USDT', amount: usdtOut },
      { sym: 'BOX', amount: boxOut },
    ],
  }
}

const getRedeemMax = (view) => BigInt(view?.wallet ?? 0)

const getRedeemSubmitGate = ({ pauseRedeem, amount, wallet } = {}) => {
  if (pauseRedeem) return 'pause'
  const amt = BigInt(amount ?? 0)
  const max = BigInt(wallet ?? 0)
  if (amt <= 0n) return 'empty'
  if (amt > max) return 'over'
  return null
}

/** 赎回成功 toast（对齐 HTML doRedeem showToast） */
const formatRedeemSuccessMessage = (quote) => {
  const q = asRedeemQuote(quote)
  if (!q) return usdxT('Redeem successful')
  const usdt = formatUsdxAmount(q.usdtOut, 2)
  const box = formatUsdxAmount(q.boxOut, 2)
  return usdxT('Redeemed {usdt} USDT and {box} BOX', { usdt, box })
}

module.exports = {
  REDEEM_MODE,
  asRedeemQuote,
  getRedeemTotalValue,
  getRedeemDisplay,
  getRedeemMax,
  getRedeemSubmitGate,
  formatRedeemSuccessMessage,
}
