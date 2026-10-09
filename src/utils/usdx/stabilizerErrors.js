const { formatTokenAmountFixed } = require('./amounts')
const { usdxT } = require('./usdxI18n')
const { MIN_LP_LIQUIDITY_NOT_MET_SELECTOR } = require('./mintFlowViews')
const { isWalletRequestTimeoutError } = require('../walletErrors')

const QUEUE_ORDER_MISMATCH_SELECTOR = '0xb5501735'
const ABI_WORD_HEX_LENGTH = 64

/** 稳定器 / Permit2 常见自定义错误（facet ABI 未全部导出时按 selector 兜底） */
const KNOWN_ERROR_MESSAGES = {
  [QUEUE_ORDER_MISMATCH_SELECTOR]: null, // 走专用解码
  '0x8baa579f': 'Invalid signature, please retry the swap', // InvalidSignature()
  '0xfab98a49': 'Stabilizer paused, swap unavailable', // StabilizerPaused()
  '0xbb55fd27': 'Insufficient liquidity, try a smaller amount', // InsufficientLiquidity()
}

const MINT_SLIPPAGE_MESSAGE = 'BOX price changed. Sign again to mint with the latest quote.'

/**
 * Decode the two uint256 ABI words returned with the stabilizer queue-match error.
 * The deployed facet ABI does not publish this private error signature, so the
 * selector is matched explicitly and its payload is decoded by ABI word order.
 * `0xb5501735` is the selector captured from TEST revert data in this repo; it is
 * not keccak256("QueueOrderMismatch(uint256,uint256)") (`0xb9f01e57`). Keep the
 * observed selector until the facet publishes the error ABI.
 *
 * @param {unknown} data
 * @returns {{ code: 'queue-order-mismatch', queueAmount: bigint, requestedAmount: bigint } | null}
 */
const decodeUsdxStabilizerErrorData = (data) => {
  if (typeof data !== 'string') return null

  const match = data.match(
    new RegExp(
      `${QUEUE_ORDER_MISMATCH_SELECTOR}([0-9a-f]{${ABI_WORD_HEX_LENGTH}})([0-9a-f]{${ABI_WORD_HEX_LENGTH}})`,
      'i'
    )
  )
  if (!match) return null

  return {
    code: 'queue-order-mismatch',
    queueAmount: BigInt(`0x${match[1]}`),
    requestedAmount: BigInt(`0x${match[2]}`),
  }
}

/**
 * Collect nested viem/provider error text without assuming one wallet's shape.
 *
 * @param {unknown} error
 * @returns {string[]}
 */
const collectErrorText = (error) => {
  const text = []
  const queue = [error]
  const visited = new Set()

  while (queue.length > 0) {
    const value = queue.shift()
    if (typeof value === 'string') {
      text.push(value)
      continue
    }
    if (!value || typeof value !== 'object' || visited.has(value)) continue
    visited.add(value)

    for (const key of ['data', 'details', 'shortMessage', 'message']) {
      const nested = value[key]
      if (typeof nested === 'string') text.push(nested)
      else if (nested && typeof nested === 'object') queue.push(nested)
    }
    if (value.cause) queue.push(value.cause)
  }

  return text
}

/**
 * Prefer viem shortMessage over the full multi-line ContractFunctionExecutionError dump.
 * @param {unknown} error
 * @returns {string | null}
 */
const getUsdxErrorShortMessage = (error) => {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' && error.trim() ? error.trim() : null
  }
  const short = error.shortMessage
  if (typeof short === 'string' && short.trim()) return short.trim()
  const message = error.message
  if (typeof message === 'string' && message.trim()) {
    const firstLine = message.trim().split('\n')[0]?.trim()
    if (firstLine) return firstLine
  }
  return null
}

/**
 * @param {unknown} error
 * @returns {string | null}
 */
const getUsdxStabilizerErrorMessage = (error) => {
  const text = collectErrorText(error)
  for (const value of text) {
    const decoded = decodeUsdxStabilizerErrorData(value)
    if (!decoded) continue
    return usdxT(
      'Queue head is {queue} USDX; this swap of {requested} USDT cannot fill a whole order. Use the queue-head amount.',
      {
        queue: formatTokenAmountFixed(decoded.queueAmount, 2),
        requested: formatTokenAmountFixed(decoded.requestedAmount, 2),
      }
    )
  }

  const joined = text.join('\n').toLowerCase()
  if (
    joined.includes('price slippage check') ||
    joined.includes('proto: maxboxin') ||
    joined.includes('minlpliquiditynotmet') ||
    joined.includes(MIN_LP_LIQUIDITY_NOT_MET_SELECTOR)
  ) {
    return usdxT(MINT_SLIPPAGE_MESSAGE)
  }
  for (const [selector, message] of Object.entries(KNOWN_ERROR_MESSAGES)) {
    if (!joined.includes(selector)) continue
    if (selector === QUEUE_ORDER_MISMATCH_SELECTOR) {
      return usdxT('This amount cannot fill a whole queue order. Refresh and retry with the latest amount.')
    }
    if (message) return usdxT(message)
  }
  if (isWalletRequestTimeoutError(error)) return usdxT('Request timed out, please retry')
  return null
}

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
const getUsdxWriteErrorMessage = (error, fallback) =>
  getUsdxStabilizerErrorMessage(error) ?? getUsdxErrorShortMessage(error) ?? fallback

module.exports = {
  decodeUsdxStabilizerErrorData,
  getUsdxErrorShortMessage,
  getUsdxStabilizerErrorMessage,
  getUsdxWriteErrorMessage,
}
