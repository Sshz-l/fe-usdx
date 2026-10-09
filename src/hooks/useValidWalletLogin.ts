import { useMemo } from 'react'
import { useAccount } from 'wagmi'

import { useStore } from '@/stores'
import { isDeBoxApp } from '@/utils/wagmiConnector'
import { isValidWalletLogin } from '@/utils/walletIdentity'

/** 有效登录：钱包已连接 + address 与 curAccountInfo 一致 */
export const useValidWalletLogin = () => {
  const { walletStore } = useStore()
  const { address, isConnected } = useAccount()

  return useMemo(
    () =>
      isValidWalletLogin({
        isConnected,
        address,
        curUserInfo: walletStore.curUserInfo,
        curAccountInfo: walletStore.curAccountInfo,
      }),
    [
      isConnected,
      address,
      walletStore.curUserInfo,
      walletStore.curAccountInfo,
    ]
  )
}

/**
 * 登录门禁：区分「有效登录」「DeBox 重连中」「需连接」。
 * 避免 DeBox 重连窗口内 UI 误判为未登录。
 */
export const useWalletSessionGate = () => {
  const { walletStore } = useStore()
  const isValidLogin = useValidWalletLogin()

  const hasStoredSession = Boolean(
    walletStore.curUserInfo?.token && walletStore.curAccountInfo?.address
  )
  const hasAuthToken = Boolean(walletStore.curUserInfo?.token)
  const hasAccountProfile = Boolean(walletStore.curAccountInfo?.address)
  const isDeBoxRestoring = isDeBoxApp() && hasStoredSession && !isValidLogin
  const isSessionHydrating =
    walletStore.loginLoading || (hasAuthToken && !hasAccountProfile)

  return {
    isValidLogin,
    hasStoredSession,
    isDeBoxRestoring,
    isSessionHydrating,
    shouldShowConnect:
      !isValidLogin && !isDeBoxRestoring && !hasAuthToken && !isSessionHydrating,
  }
}
