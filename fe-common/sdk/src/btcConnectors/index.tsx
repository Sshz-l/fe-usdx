import React, { createContext, useContext, useEffect, useState } from 'react'

import { ObxWalletConnector } from './okxWallet'
import { UniSatWalletConnector } from './uniSatWallet'

const BTCStoreContext = createContext<{
  connectors: TConnector[]
  connector: TConnector
  setConnector: any
  account: TAccount
  setAccount: any
}>({
  connectors: [],
  connector: null,
  setConnector: null,
  account: null,
  setAccount: null,
})

export function useBTCStore () {
  const context = useContext(BTCStoreContext)
  if (context === undefined) {
    throw new Error('useBTCStore must be used within BTCStoreProvider.Provider')
  }
  return context
}

type TConnector = any
type TAccount = any

const connectors: TConnector[] = [new ObxWalletConnector(), new UniSatWalletConnector()]

export function BTCStoreProvider ({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<TAccount>(null)
  const [connector, setConnector] = useState<TConnector>(null)

  useEffect(() => {
    const changeFn = (account: TAccount) => {
      setAccount(account)
    }
    const disconnectFn = () => {
      console.log('disconnectFn:')
      setAccount(null)
      setConnector(null)
    }
    connector?.on('change', changeFn)
    connector?.on('disconnect', disconnectFn)

    return () => {
      connector?.off('change', changeFn)
      connector?.off('disconnect', disconnectFn)
    }
  }, [connector])

  return (
    <BTCStoreContext.Provider
      value={{
        connectors,
        connector,
        setConnector,
        account,
        setAccount,
      }}
    >
      {children}
    </BTCStoreContext.Provider>
  )
}
