import { useCallback, useState } from 'react'

import { useBTCStore } from '../../btcConnectors'
import { sleep } from '../..//utils'

export const useConnect = () => {
  const store = useBTCStore()

  const [isLoading, setLoading] = useState(false)
  const [pendingConnector, setPendingConnector] = useState<any>(null)

  const connectAsync = useCallback(
    async ({ connector }: { connector: any }) => {
      setLoading(true)

      setPendingConnector(connector)

      let res
      try {
        store.setConnector(connector)

        await sleep(800)

        res = await connector?.connect?.()
      } catch (e) {
        console.error(e)
      }

      setPendingConnector(null)

      setLoading(false)

      return res
    },
    [store]
  )

  return { connectAsync, connectors: store?.connectors, isLoading, pendingConnector }
}
