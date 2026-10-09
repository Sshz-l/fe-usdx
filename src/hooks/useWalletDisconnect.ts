import { useCallback } from 'react'
import { useDisconnect, useAccount } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useDisconnect as useBTCDisconnect } from '@fe-common/sdk/src/hooks/btc/useDisconnect'
import { clearWagmiPersistedState } from '@/utils/wagmiStorage'

export const useWalletDisconnect = () => {
  const { isConnected } = useAccount()
  const { disconnectAsync, connectors, disconnect } = useDisconnect()
  const { disconnect: disconnectBTC } = useBTCDisconnect()
  const { disconnect: disconnectSolana, select: selectSolana } = useSolanaWallet()

  const disconnectWallets = useCallback(async () => {
    try {
      if (connectors?.length && isConnected) {
        const disconnectTasks = [
          disconnectAsync().catch(() => undefined),
          ...connectors.map((c) => disconnectAsync({ connector: c }).catch(() => undefined)),
        ]
        await Promise.all(disconnectTasks)
      }

      disconnect()
      disconnectBTC()
      disconnectSolana?.()
      selectSolana?.(null)
      await clearWagmiPersistedState()
    } catch (e) {
      console.error('Failed to disconnect wallets:', e)
    }
  }, [
    connectors,
    disconnect,
    disconnectAsync,
    disconnectBTC,
    disconnectSolana,
    isConnected,
    selectSolana,
  ])

  return {
    disconnectWallets,
  }
}
