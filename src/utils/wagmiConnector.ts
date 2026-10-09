import type { Connector } from 'wagmi'

import {
  isBrokenConnectorError,
  isBrokenConnectorGlobalError,
} from './wagmiConnectorGuard.js'

export { isBrokenConnectorError, isBrokenConnectorGlobalError }

export const isDeBoxApp = () =>
  typeof window !== 'undefined' && !!window.navigator?.userAgent?.includes('DeBox')

/** DeBox WebView 内不恢复 localStorage 连接，由 injected provider 每次重新 connect */
export const shouldWagmiReconnectOnMount = () =>
  typeof window === 'undefined' || !isDeBoxApp()

/** DeBox WebView 内可用的 EIP-1193 provider */
export const hasInjectedProvider = () => {
  if (typeof window === 'undefined') return false
  const w = window as Window & {
    debox?: { ethereum?: unknown; provider?: unknown }
    ethereum?: unknown
  }
  return !!(w.debox?.ethereum || w.debox?.provider || w.ethereum)
}

export const isInjectedConnector = (connector: Connector) =>
  connector.type === 'injected' || connector.id === 'injected' || connector.id === 'io.metamask'

/** connector 实例是否完整（非 localStorage 反序列化后的 plain object） */
export const isConnectorUsable = (connector: Connector | undefined): connector is Connector =>
  !!connector &&
  typeof connector.getChainId === 'function' &&
  typeof connector.getProvider === 'function' &&
  typeof connector.connect === 'function'

/** @deprecated 与 isConnectorUsable 相同，保留兼容 walletConnector.js */
export const canAutoSwitchChain = isConnectorUsable

export const getManualSwitchMessage = (chainName?: string) => {
  const targetName = chainName || 'target network'
  return `Current wallet does not support automatic network switching. Please switch to ${targetName} manually and try again`
}

type SafeSwitchChainParams = {
  connector: Connector | undefined
  switchChainAsync: ((args: { chainId: number }) => Promise<unknown>) | undefined
  chainId: number
  chainName?: string
  /** connector 已损坏时回调（通常清 wagmi store 并提示重连） */
  onBrokenConnector?: () => void | Promise<void>
}

export type SafeSwitchChainResult =
  | { ok: true }
  | { ok: false; message: string; broken: boolean }

/**
 * 安全切链：先校验 connector 方法完整性，捕获 getChainId 类错误并触发修复回调。
 */
export const safeSwitchChainAsync = async ({
  connector,
  switchChainAsync,
  chainId,
  chainName,
  onBrokenConnector,
}: SafeSwitchChainParams): Promise<SafeSwitchChainResult> => {
  if (!switchChainAsync) {
    return { ok: false, message: getManualSwitchMessage(chainName), broken: false }
  }

  if (!isConnectorUsable(connector)) {
    return { ok: false, message: getManualSwitchMessage(chainName), broken: true }
  }

  try {
    await switchChainAsync({ chainId })
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const broken = isBrokenConnectorError(msg)
    if (broken) {
      await onBrokenConnector?.()
      return { ok: false, message: getManualSwitchMessage(chainName), broken: true }
    }
    return { ok: false, message: msg || 'Switch network failed', broken: false }
  }
}

/**
 * DeBox 自动连接仅使用 injected 且方法完整的 connector。
 * 绝不回退到 connectors[0]（可能是 Binance / WalletConnect）。
 */
export const pickInjectedConnector = (connectors: readonly Connector[]): Connector | undefined => {
  const candidates = connectors.filter((c) => isInjectedConnector(c) && isConnectorUsable(c))

  return (
    candidates.find((c) => c.id === 'injected') ??
    candidates.find((c) => c.type === 'injected') ??
    candidates[0]
  )
}

/** 华为等机型 WebView 注入较慢，自动连接需更长等待 */
export const isSlowWebViewDevice = () => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /HUAWEI|HarmonyOS|HONOR|OPPO|vivo|Xiaomi|Redmi|MI\s/i.test(ua)
}

export const getInjectedProviderDiagnostics = () => {
  if (typeof window === 'undefined') return 'N/A'
  const w = window as Window & {
    debox?: { ethereum?: unknown; provider?: unknown }
    ethereum?: unknown
  }
  const flags = [
    w.debox?.ethereum ? 'debox.ethereum' : null,
    w.debox?.provider ? 'debox.provider' : null,
    w.ethereum ? 'window.ethereum' : null,
  ].filter(Boolean)
  return flags.length ? flags.join(', ') : 'none'
}

export const getWagmiStoreDiagnostics = () => {
  if (typeof window === 'undefined') return 'N/A'
  try {
    const raw = localStorage.getItem('wagmi.store')
    if (!raw) return 'empty'
    const parsed = JSON.parse(raw) as {
      state?: {
        current?: string | null
        connections?: { value?: unknown[] }
      }
    }
    const count = parsed?.state?.connections?.value?.length ?? 0
    const current = parsed?.state?.current ?? 'null'
    return `connections=${count}, current=${current}`
  } catch {
    return 'parse_error'
  }
}

export const getConnectorDiagnostics = (connectors: readonly Connector[]) =>
  connectors
    .map((c) => {
      const usable = isConnectorUsable(c)
      return `${c.id}/${c.type}${usable ? '' : '(broken)'}`
    })
    .join('; ') || 'none'
