import { useCallback, useRef, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'

import {
  hasInjectedProvider,
  isDeBoxApp,
  isSlowWebViewDevice,
  pickInjectedConnector,
} from '@/utils/wagmiConnector'
import { isUserRejectedWalletError } from '@/utils/walletIdentity'

/** DeBox WebView 内静默重连 injected 钱包（不登出、不弹窗） */
export const useDeBoxSilentReconnect = () => {
  const { isConnected, status } = useAccount()
  const { connectAsync, connectors, isPending } = useConnect()
  const inFlightRef = useRef(false)
  const [inFlight, setInFlight] = useState(false)

  const isReconnecting =
    inFlight || isPending || status === 'connecting' || status === 'reconnecting'

  const trySilentReconnect = useCallback(async (): Promise<boolean> => {
    if (!isDeBoxApp() || isConnected || inFlightRef.current) {
      return isConnected
    }
    if (isPending || status === 'connecting' || status === 'reconnecting') {
      return false
    }
    if (!hasInjectedProvider()) return false

    const connector = pickInjectedConnector(connectors)
    if (!connector) return false

    inFlightRef.current = true
    setInFlight(true)
    try {
      if (isSlowWebViewDevice()) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      await connectAsync({ connector })
      return true
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        console.error('DeBox silent reconnect failed:', e)
      }
      return false
    } finally {
      inFlightRef.current = false
      setInFlight(false)
    }
  }, [connectAsync, connectors, isConnected, isPending, status])

  return { trySilentReconnect, isReconnecting }
}
