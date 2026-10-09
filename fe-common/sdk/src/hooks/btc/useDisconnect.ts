import { useCallback } from 'react'

import { useBTCStore } from '../../btcConnectors'

export const useDisconnect = () => {
  const store = useBTCStore()

  const disconnect = useCallback(() => {
    store?.setAccount(null)
    store?.setConnector(null)
  }, [store])

  return { disconnect }
}
