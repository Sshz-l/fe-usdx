/**
 * H5 生产排查日志：客户端会收集 WebView console，供前端下载分析。
 * 字段/指纹契约见 docs/superpowers/specs/2026-09-24-h5-logging-spec.md
 * 与 RN packages/logger（FNV-1a hash8、扁平 k=v）对齐。
 */

export {
  buildKeys,
  extractApiPath,
  formatErr,
  hash8,
  sanitizeRequestId,
} from './h5LoggerFields'

const PREFIX = '[H5]'
const MAX_LEN = 500
const MAX_KEYS = 10

export type H5LogLevel = 'i' | 'w' | 'e'

/**
 * H5 tag 命名空间：`H5.<Module>[.<Sub>]`，与 RN `Rn.*` 平行。
 * Module 语义对齐 wiki Net/Login/Wallet/App/Oss（§3.2）。
 */
export const H5_LOG_TAGS = {
  NetReq: 'H5.Net.Req',
  LoginToken: 'H5.Login.Token',
  LoginAccount: 'H5.Login.Account',
  WalletTx: 'H5.Wallet.Tx',
  AppRouter: 'H5.App.Router',
  OssUpload: 'H5.Oss.Upload',
} as const

/**
 * 注意：next/compiler removeConsole 在部分环境下会剥掉 console.info，
 * 即使配置了 exclude: ['info']。正式包已验证 info 调用体被清空。
 * 因此 info/error 统一走 console.error，用 [I]/[E] 区分级别。
 */
const toShortText = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message || value.name || 'Error'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const truncate = (text: string, max = MAX_LEN): string => {
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

const consoleLevelFrom = (level: H5LogLevel): 'I' | 'E' => (level === 'e' ? 'E' : 'I')

const emitLine = (line: string) => {
  if (typeof console === 'undefined') return
  console.error(truncate(line))
}

const formatLegacyArgs = (level: 'I' | 'E', args: unknown[]): string => {
  const body = args
    .map((arg) => toShortText(arg))
    .filter(Boolean)
    .join(' ')
  const withPrefix = body.startsWith(PREFIX) ? body : `${PREFIX} ${body}`
  const leveled = withPrefix.startsWith(`${PREFIX} `)
    ? `${PREFIX}[${level}] ${withPrefix.slice(PREFIX.length + 1)}`
    : `${PREFIX}[${level}] ${withPrefix}`
  return leveled
}

const emitLegacy = (level: 'I' | 'E', args: unknown[]) => {
  emitLine(formatLegacyArgs(level, args))
}

export const h5Logger = {
  /**
   * 结构化日志：tag + 扁平 keys。
   * 输出示例：[H5][E] H5.Net.Req event=req_done ok=false ...
   */
  log: (tag: string, level: H5LogLevel, keys: string[]) => {
    const normalized = keys.filter(Boolean).slice(0, MAX_KEYS)
    const consoleLevel = consoleLevelFrom(level)
    emitLine(`${PREFIX}[${consoleLevel}] ${tag} ${normalized.join(' ')}`)
  },
  /** @deprecated 新代码请用 log() */
  info: (...args: unknown[]) => {
    emitLegacy('I', args)
  },
  /** @deprecated 新代码请用 log() */
  error: (...args: unknown[]) => {
    emitLegacy('E', args)
  },
}

export default h5Logger
