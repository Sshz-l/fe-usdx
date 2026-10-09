import { useCallback } from 'react'
import { useAccount, useConnect, type BaseError } from 'wagmi'
import { toast } from 'react-toastify'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { useLogin } from '@/hooks/useLogin'
import { useStore } from '@/stores'
import {
  hasInjectedProvider,
  isBrokenConnectorError,
  isDeBoxApp,
  isSlowWebViewDevice,
  pickInjectedConnector,
} from '@/utils/wagmiConnector'
import { clearWagmiPersistedState } from '@/utils/wagmiStorage'
import {
  clearManualLogoutPending,
  isConnectorAlreadyConnectedError,
  isUserRejectedWalletError,
} from '@/utils/walletIdentity'

type TConnectModalData = {
  walletType?: 'evm' | 'solana' | 'btc' | 'tron'
  isDeSwap?: boolean
  hasNoBtc?: boolean
}

type TDirectConnectResult = {
  /** 是否已由 DeBox 直连逻辑处理（true 时不应再打开选择弹窗） */
  handled: boolean
}

type TDeBoxDirectConnectOptions = {
  /** USDX 等隐藏了全局 ToastContainer 的页面，需注入带 containerId 的错误提示 */
  showError?: (message: string) => void
}

export const useDeBoxDirectConnect = (options?: TDeBoxDirectConnectOptions) => {
  useLingui()

  const { walletStore } = useStore()
  const { logoutFn, loginFn } = useLogin()
  const { isConnected } = useAccount()
  const { connectAsync, connectors, isPending } = useConnect()
  const showError = options?.showError

  const tryDeBoxDirectConnect = useCallback(
    async (data?: TConnectModalData): Promise<TDirectConnectResult> => {
      const isEvmRequest = !data?.walletType || data.walletType === 'evm'
      const notifyError = (message: string) => {
        if (showError) showError(message)
        else toast.error(message)
      }

      if (!isDeBoxApp() || !isEvmRequest) {
        return { handled: false }
      }

      if (!hasInjectedProvider()) {
        notifyError(t`No injected wallet detected`)
        return { handled: true }
      }

      const connector = pickInjectedConnector(connectors)
      if (!connector) {
        notifyError(t`No injected wallet detected`)
        return { handled: true }
      }

      if (isPending) {
        return { handled: true }
      }

      clearManualLogoutPending()

      try {
        // DeBox 保留本地 session，仅重建 wagmi 连接；地址变化由 loginFn 处理
        if (!isDeBoxApp() && (walletStore?.curUserInfo?.token || isConnected)) {
          await logoutFn()
        }

        if (isConnected) {
          await loginFn()
          return { handled: true }
        }

        if (isSlowWebViewDevice()) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        await connectAsync({ connector })
        return { handled: true }
      } catch (error) {
        const message =
          (error as BaseError)?.shortMessage ||
          (error instanceof Error ? error.message : t`Connection failed`)

        if (isUserRejectedWalletError(error)) {
          return { handled: true }
        }

        if (isConnectorAlreadyConnectedError(error)) {
          await loginFn()
          return { handled: true }
        }

        if (isBrokenConnectorError(message)) {
          await clearWagmiPersistedState()
        }

        notifyError(message)
        return { handled: true }
      }
    },
    [
      connectors,
      connectAsync,
      isConnected,
      isPending,
      loginFn,
      logoutFn,
      showError,
      walletStore?.curUserInfo?.token,
    ]
  )

  return { tryDeBoxDirectConnect }
}
