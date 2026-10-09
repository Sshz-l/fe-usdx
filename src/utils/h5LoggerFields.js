/**
 * H5 结构化日志纯函数（CJS）。
 * 与 RN packages/logger 契约对齐，供 h5Logger.ts 与 node:test 共用。
 * 见 docs/superpowers/specs/2026-09-24-h5-logging-spec.md
 */

const MAX_KEYS = 10
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{1,128}$/

/** 校验服务端 request_id，异常值按缺失处理（§5.4） */
function sanitizeRequestId(value) {
  const id = String(value ?? '').trim()
  return REQUEST_ID_RE.test(id) ? id : undefined
}

/** API path，不含 query（§8.2） */
function extractApiPath(url) {
  return String(url ?? '')
    .split('?')[0]
    .replace(/^\/+/, '')
}

/**
 * FNV-1a 32 位 → 8 位小写 hex。
 * 与 RN packages/logger/errFields.ts hash8 同算法，用于跨端 acct8 / txhash8 关联。
 */
function hash8(value) {
  const input = String(value ?? '').trim()
  if (!input) return undefined
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/**
 * 从错误 message 推断短原因码（参考 RN packages/errors/converters.ts 常见命中）。
 * 不命中时返回 null，由 formatErr 使用 fallbackReason。
 */
function inferErrReason(message) {
  const m = String(message || '').toLowerCase()
  if (!m) return null

  // 用户拒绝：最先判
  if (
    m.includes('user rejected') ||
    m.includes('user denied') ||
    m.includes('user cancel') ||
    m.includes('用户取消') ||
    m.includes('用户拒绝') ||
    /\b4001\b/.test(m)
  ) {
    return 'user_rejected'
  }

  if (m.includes('no active activity')) return 'app_not_foreground'

  if (
    m.includes('chain mismatch') ||
    m.includes('wrong network') ||
    m.includes('network mismatch') ||
    m.includes('unsupported chain')
  ) {
    return 'chain_mismatch'
  }

  if (
    m.includes('insufficient funds for transfer') ||
    m.includes('insufficient balance') ||
    m.includes('exceeds balance') ||
    m.includes('余额不足')
  ) {
    return 'insufficient_balance'
  }

  if (
    m.includes('insufficient funds for gas') ||
    m.includes('insufficient funds for rent') ||
    m.includes('insufficient gas') ||
    m.includes('insufficient lamports') ||
    m.includes('gas required exceeds') ||
    m.includes('out of gas') ||
    (m.includes('gas') && m.includes('insufficient'))
  ) {
    return 'insufficient_gas'
  }

  // 泛化 insufficient funds（在 balance/gas 特判之后）
  if (m.includes('insufficient funds') || m.includes('insufficient')) {
    return 'insufficient'
  }

  if (
    m.includes('insufficient_liquidity') ||
    m.includes('insufficient liquidity') ||
    m.includes('liquidity') ||
    m.includes('reserves') ||
    m.includes('流动性')
  ) {
    return 'insufficient_liquidity'
  }

  if (
    m.includes('insufficient_output_amount') ||
    m.includes('insufficient output amount') ||
    m.includes('too little received') ||
    m.includes('slippage') ||
    m.includes('滑点')
  ) {
    return 'slippage'
  }

  if (
    m.includes('confirmation timeout') ||
    m.includes('confirm failed: confirmation timeout') ||
    m.includes('确认超时')
  ) {
    return 'confirmation_timeout'
  }

  if (m.includes('quote') && m.includes('timeout')) return 'quote_timeout'
  if (m.includes('rpc') && m.includes('timeout')) return 'rpc_timeout'

  if (
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('deadline exceeded') ||
    m.includes('超时')
  ) {
    return 'timeout'
  }

  if (
    m.includes('blockhash not found') ||
    m.includes('block height exceeded') ||
    (m.includes('transaction') && m.includes('expired')) ||
    (m.includes('revert') && m.includes('expired'))
  ) {
    return 'deadline_exceeded'
  }

  if (m.includes('expired') || m.includes('报价已过期')) return 'quote_expired'

  if (
    (m.includes('network') && !m.includes('insufficient')) ||
    m.includes('networkerror') ||
    m.includes('failed to fetch') ||
    m.includes('fetch failed') ||
    m.includes('net::err')
  ) {
    return 'network'
  }

  if (
    m.includes('no route') ||
    m.includes('path not found') ||
    m.includes('无法找到')
  ) {
    return 'no_route'
  }

  if (m.includes('execution reverted') || m.includes('revert')) return 'revert'

  return null
}

/** err=<Name>:<reason>，禁止原始 message 全文（§8.2） */
function formatErr(error, fallbackReason = 'unknown') {
  if (error instanceof Error) {
    const name = error.name || 'Error'
    const reason = inferErrReason(error.message || '') || fallbackReason
    return `${name}:${reason}`
  }
  if (typeof error === 'string' && error.trim()) {
    return `Error:${inferErrReason(error) || fallbackReason}`
  }
  return `Error:${fallbackReason}`
}

/**
 * 扁平 k=v：缺失省略；event 优先；再截断到 MAX_KEYS（§4.1）。
 * 先规范化顺序再截断，避免 event 排在第 11 位被丢掉。
 */
function buildKeys(pairs) {
  const rest = []
  let eventKey
  for (const [k, v] of Object.entries(pairs || {})) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && v === '') continue
    const item = `${k}=${v}`
    if (k === 'event') eventKey = item
    else rest.push(item)
  }
  const ordered = eventKey ? [eventKey, ...rest] : rest
  return ordered.slice(0, MAX_KEYS)
}

module.exports = {
  MAX_KEYS,
  sanitizeRequestId,
  extractApiPath,
  hash8,
  inferErrReason,
  formatErr,
  buildKeys,
}
