const { formatUnits, parseUnits } = require('viem')
const { usdxT } = require('./usdxI18n')

const TOKEN_DECIMALS = 18
const ONE_TOKEN = 10n ** BigInt(TOKEN_DECIMALS)
const DECIMAL_PATTERN = /^\d+(?:\.\d{1,18})?$/

/**
 * @typedef {{ ok: true, amount: bigint } | { ok: false, code: 'invalid-format' }} TTokenAmountResult
 */

/**
 * Parse an 18-decimal token input without passing through floating point.
 * @param {string} raw
 * @returns {TTokenAmountResult}
 */
const parseTokenAmount = (raw) => {
  if (!DECIMAL_PATTERN.test(raw)) return { ok: false, code: 'invalid-format' }

  try {
    return { ok: true, amount: parseUnits(raw, TOKEN_DECIMALS) }
  } catch {
    return { ok: false, code: 'invalid-format' }
  }
}

/**
 * @typedef {
 *   | { ok: true, d: bigint, usdtIn: bigint }
 *   | { ok: false, code: 'invalid-format' | 'below-minimum' | 'odd-minimum-unit' }
 * } TDepositDResult
 */

/**
 * Parse total mint deposit D and derive its exact USDT half.
 * @param {string} raw
 * @returns {TDepositDResult}
 */
const parseDepositD = (raw) => {
  const parsed = parseTokenAmount(raw)
  if (!parsed.ok) return parsed
  if (parsed.amount < ONE_TOKEN) return { ok: false, code: 'below-minimum' }
  if (parsed.amount % 2n !== 0n) return { ok: false, code: 'odd-minimum-unit' }

  return { ok: true, d: parsed.amount, usdtIn: parsed.amount / 2n }
}

/**
 * Format an 18-decimal amount without converting through floating point.
 * @param {bigint} amount
 * @returns {string}
 */
const formatTokenAmount = (amount) => formatUnits(amount, TOKEN_DECIMALS)

/** Slider / balance fill：固定小数位、无千分位，对齐 HTML toFixed(dp) */
const formatTokenAmountFixed = (amount, dp = 2) => {
  const full = formatUnits(amount, TOKEN_DECIMALS)
  const negative = full.startsWith('-')
  const unsigned = negative ? full.slice(1) : full
  const [intPart, frac = ''] = unsigned.split('.')
  if (dp <= 0) return `${negative ? '-' : ''}${intPart}`
  const fracFixed = `${frac}${'0'.repeat(dp)}`.slice(0, dp)
  return `${negative ? '-' : ''}${intPart}.${fracFixed}`
}

/**
 * Preserve the difference between a pending/failed balance read and a real zero balance.
 * @param {bigint | null | undefined} amount
 * @param {boolean} isLoading
 * @param {boolean} isError
 * @returns {
 *   | { status: 'ready', amount: bigint }
 *   | { status: 'loading' | 'error', amount: null }
 * }
 */
const getBalanceReadState = (amount, isLoading, isError) => {
  if (isError) return { status: 'error', amount: null }
  if (isLoading) return { status: 'loading', amount: null }
  if (typeof amount !== 'bigint') return { status: 'error', amount: null }
  return { status: 'ready', amount }
}

/**
 * Wallet-balance copy: unread must not look like a real zero.
 * @param {{ status: 'ready' | 'loading' | 'error', amount: bigint | null }} state
 * @param {(amount: bigint) => string} formatReady
 */
const formatBalanceDisplayText = (state, formatReady) => {
  if (state.status === 'ready') return formatReady(state.amount)
  if (state.status === 'loading') return '…'
  return '—'
}

/**
 * @param {boolean | null | undefined} value
 * @param {boolean} isLoading
 * @param {boolean} isError
 * @returns {
 *   | { status: 'ready', value: boolean }
 *   | { status: 'loading' | 'error', value: null }
 * }
 */
const getBooleanReadState = (value, isLoading, isError) => {
  if (isError) return { status: 'error', value: null }
  if (isLoading) return { status: 'loading', value: null }
  if (typeof value !== 'boolean') return { status: 'error', value: null }
  return { status: 'ready', value }
}

/**
 * @param {'invalid-format' | 'below-minimum' | 'odd-minimum-unit'} code
 * @returns {string}
 */
const getDepositErrorMessage = (code) => {
  if (code === 'below-minimum') return usdxT('Minimum deposit is 1 USDT')
  if (code === 'odd-minimum-unit') return usdxT('Too many decimals, please reduce by one digit')
  return usdxT('Enter a valid amount')
}

module.exports = {
  formatTokenAmount,
  formatTokenAmountFixed,
  formatBalanceDisplayText,
  getBalanceReadState,
  getBooleanReadState,
  getDepositErrorMessage,
  parseDepositD,
  parseTokenAmount,
}
