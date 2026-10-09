export type ResolvedWalletIdentity = {
  chain: 'evm'
  address: string
}

/** 自动登录仅支持 EVM：须 wagmi 已连接且有地址 */
export const resolveEvmWalletIdentity = (
  evmAddress?: string | null,
  evmConnected?: boolean
): ResolvedWalletIdentity | null => {
  const evm = evmAddress?.trim()
  if (evmConnected && evm) {
    return { chain: 'evm', address: evm.toLowerCase() }
  }
  return null
}

export const walletIdentityKey = (identity: ResolvedWalletIdentity): string =>
  `evm:${identity.address}`

export const addressesMatchStored = (
  storedAddress: string | undefined,
  identity: ResolvedWalletIdentity | null | undefined
): boolean => {
  if (!storedAddress || !identity) return false
  return storedAddress.toLowerCase() === identity.address
}

/** 有效登录：钱包已连接且 address 与 curAccountInfo 一致 */
export const isValidWalletLogin = (params: {
  isConnected: boolean
  address?: string | null
  curUserInfo?: { token?: string } | null
  curAccountInfo?: { address?: string } | null
}): boolean => {
  const { isConnected, address, curUserInfo, curAccountInfo } = params
  if (!curUserInfo?.token || !curAccountInfo?.address) return false
  if (!isConnected || !address) return false
  return addressesMatchStored(
    curAccountInfo.address,
    resolveEvmWalletIdentity(address, isConnected)
  )
}

export const isUserRejectedWalletError = (err: unknown): boolean => {
  const anyErr = err as {
    code?: number
    cause?: { code?: number; message?: string }
    shortMessage?: string
    message?: string
  }
  const code = anyErr?.code ?? anyErr?.cause?.code
  const msg = String(anyErr?.shortMessage ?? anyErr?.message ?? anyErr?.cause?.message ?? '')
  return code === 4001 || /user rejected|rejected|denied|cancelled/i.test(msg)
}

export const isConnectorAlreadyConnectedError = (err: unknown): boolean => {
  const anyErr = err as { shortMessage?: string; message?: string; cause?: { message?: string } }
  const msg = String(anyErr?.shortMessage ?? anyErr?.message ?? anyErr?.cause?.message ?? '')
  return /connector already connected/i.test(msg)
}

const MANUAL_LOGOUT_PENDING_KEY = 'walletStore.manualLogoutPending'

/** 用户主动登出后，抑制 DeBox 内自动签名登录，直至再次点击连接钱包 */
export const isManualLogoutPending = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(MANUAL_LOGOUT_PENDING_KEY) === 'true'
}

export const markManualLogoutPending = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(MANUAL_LOGOUT_PENDING_KEY, 'true')
}

export const clearManualLogoutPending = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MANUAL_LOGOUT_PENDING_KEY)
}

export const normalizeAccountAddress = (
  accountInfo: { address?: string } | null | undefined,
  fallbackAddress?: string | null
) => {
  const rawAddress = accountInfo?.address || fallbackAddress || ''
  const normalized = rawAddress.trim().toLowerCase()
  if (!normalized) {
    return ''
  }
  return normalized.startsWith('0x') ? normalized : `0x${normalized}`
}
