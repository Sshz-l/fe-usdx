import { useCallback, useRef, useState } from 'react'
import {
  useAccount,
  useConfig,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from 'wagmi'
import { t } from '@lingui/macro'

import { USDX_CHAIN_ID } from '@/constants/usdxConfig'
import { clearWagmiPersistedState } from '@/utils/wagmiStorage'
import {
  getManualSwitchMessage,
  isBrokenConnectorError,
} from '@/utils/wagmiConnector'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { markManualLogoutPending } from '@/utils/walletIdentity'
import { disconnectUsdxWallet } from '@/utils/usdx/walletConnection'
import { getUsdxWalletName } from '@/utils/usdx/walletOptions'
import { ensureUsdxWalletChain } from '@/utils/usdx/ensureUsdxChain'

export const useUsdxWallet = (targetChainId = USDX_CHAIN_ID) => {
  const account = useAccount()
  const { data: walletClient } = useWalletClient()
  const { connectors: connectedConnectors, disconnectAsync } = useDisconnect()
  const wagmiConfig = useConfig()
  const { switchChainAsync } = useSwitchChain()
  const [disconnecting, setDisconnectingState] = useState(false)
  const disconnectingRef = useRef(false)

  const setDisconnecting = useCallback((value: boolean) => {
    disconnectingRef.current = value
    setDisconnectingState(value)
  }, [])

  const switchToTargetChain = useCallback(async () => {
    const manualMessage = getManualSwitchMessage('BNB Smart Chain')
    if (!walletClient) {
      return {
        ok: false as const,
        message: manualMessage,
        rejected: false,
        error: undefined,
      }
    }

    try {
      await ensureUsdxWalletChain({
        targetChainId,
        walletClient,
        switchChainAsync,
        missingMessage: manualMessage,
        switchMessage: t`Please switch to BNB Smart Chain`,
      })
      return { ok: true as const }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        ok: false as const,
        message: isBrokenConnectorError(message) ? manualMessage : message || t`Failed to switch network`,
        rejected: isUserRejectedWalletError(error),
        error,
      }
    }
  }, [switchChainAsync, targetChainId, walletClient])

  const disconnectWallet = useCallback(async () => {
    if (disconnectingRef.current) return

    await disconnectUsdxWallet({
      connectors: connectedConnectors,
      currentConnector: account.connector,
      disconnectConnector: (connector) => disconnectAsync({ connector }),
      markManualLogout: markManualLogoutPending,
      resetConnectionState: () => {
        wagmiConfig.setState((state) => ({
          ...state,
          connections: new Map(),
          current: null,
          status: 'disconnected',
        }))
      },
      clearPersistedState: clearWagmiPersistedState,
      setDisconnecting,
    })
  }, [account.connector, connectedConnectors, disconnectAsync, setDisconnecting, wagmiConfig])

  const isConnected = account.isConnected && !disconnecting
  const walletState = !isConnected
    ? 'off'
    : account.chainId === targetChainId
      ? 'on'
      : 'wrong'

  return {
    ...account,
    isConnected,
    disconnecting,
    walletState,
    walletName: getUsdxWalletName(account.connector),
    switchToTargetChain,
    disconnectWallet,
  } as const
}
