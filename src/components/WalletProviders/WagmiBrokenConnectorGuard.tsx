import { useEffect, useRef } from 'react'
import { useDisconnect } from 'wagmi'

import { isBrokenConnectorGlobalError } from '@/utils/wagmiConnector'
import { clearWagmiPersistedState } from '@/utils/wagmiStorage'

/**
 * 兜底：wagmi reconnect/hydration 内部调用 connector.getChainId() 失败时，
 * 业务层 safeSwitchChainAsync 无法拦截，需在全局捕获并清 store + disconnect。
 */
export const WagmiBrokenConnectorGuard = () => {
  const { disconnect } = useDisconnect()
  const recoveringRef = useRef(false)

  useEffect(() => {
    const recoverFromBrokenConnector = async (message?: string, stack?: string) => {
      if (!isBrokenConnectorGlobalError(message, stack) || recoveringRef.current) return

      recoveringRef.current = true
      try {
        await clearWagmiPersistedState()
        disconnect()
      } catch {
        // ignore
      } finally {
        recoveringRef.current = false
      }
    }

    const onError = (event: ErrorEvent) => {
      const error = event.error
      const message = event.message || (error instanceof Error ? error.message : '')
      const stack = error instanceof Error ? error.stack : undefined
      void recoverFromBrokenConnector(message, stack)
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack = reason instanceof Error ? reason.stack : undefined
      void recoverFromBrokenConnector(message, stack)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [disconnect])

  return null
}
