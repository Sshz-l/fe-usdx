import { createContext, useContext } from 'react'
import { enableStaticRendering } from 'mobx-react-lite'

import CommonStore from './commonStore'
import WalletStore from './walletStore'

const isServer = typeof window === 'undefined'
enableStaticRendering(isServer)

export let store: TStore

export interface TStore {
  commonStore: CommonStore
  walletStore: WalletStore
}

export function initializeStore(initialData: any = {}) {
  const _store: TStore = store ?? {
    commonStore: new CommonStore(),
    walletStore: new WalletStore(),
  }

  // 在实例中定义 hydrate 方法用于改变初始化数据（比如数据来源于异步请求）
  if (initialData) {
    ;(Object.keys(_store) as Array<keyof TStore>).forEach((key) => {
      if (typeof _store[key]?.hydrate === 'function' && typeof initialData[key] !== 'undefined') {
        _store[key]?.hydrate(initialData[key])
      }
    })
  }
  if (isServer) return _store
  if (!store) store = _store

  return _store
}

export const StoreContext = createContext<TStore>({} as TStore)

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within StoreContext.Provider')
  }

  return context
}
