const EXPLICIT_REJECTION_PATTERN =
  /^user (?:rejected|denied|cancelled|canceled) (?:the )?(?:request|transaction)\.?$/i

/**
 * Accept both provider errors and normalized messages returned by wallet helpers.
 * @param {unknown} error
 * @returns {boolean}
 */
const isUserRejectedWalletError = (error) => {
  if (typeof error === 'string') return EXPLICIT_REJECTION_PATTERN.test(error.trim())
  if (!error || typeof error !== 'object') return false

  const value = error
  const cause = value.cause && typeof value.cause === 'object' ? value.cause : null
  const code = value.code ?? cause?.code
  const name = String(value.name ?? '')
  if (
    code === 4001 ||
    code === '4001' ||
    code === 5000 ||
    code === '5000' ||
    name === 'UserRejectedRequestError'
  )
    return true
  if (cause && isUserRejectedWalletError(cause)) return true

  const message = String(value.shortMessage ?? value.message ?? '')
  return EXPLICIT_REJECTION_PATTERN.test(message.trim())
}

const WALLET_REQUEST_TIMEOUT_PATTERN = /\brequest (?:timeout|timed out)\b/i

/**
 * DeBox 注入 provider 对需用户确认的请求有硬超时（-32002 "Request timeout"），
 * viem 会把原文包进 details / cause，需沿 cause 链查找。
 * @param {unknown} error
 * @returns {boolean}
 */
const isWalletRequestTimeoutError = (error) => {
  const visited = new Set()
  let value = error
  while (value) {
    if (typeof value === 'string') return WALLET_REQUEST_TIMEOUT_PATTERN.test(value)
    if (typeof value !== 'object' || visited.has(value)) return false
    visited.add(value)
    for (const key of ['details', 'shortMessage', 'message']) {
      const text = value[key]
      if (typeof text === 'string' && WALLET_REQUEST_TIMEOUT_PATTERN.test(text)) return true
    }
    value = value.cause
  }
  return false
}

module.exports = { isUserRejectedWalletError, isWalletRequestTimeoutError }
