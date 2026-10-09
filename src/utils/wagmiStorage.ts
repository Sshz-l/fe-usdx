import { wagmiConfig } from '@/connectors'

import { removeWagmiLocalStorageKeys } from '@/utils/wagmiStorageMigration'

/** 清除 wagmi 持久化状态，避免 WebView 内残留损坏的 connector 导致 getChainId 报错 */
export const clearWagmiPersistedState = async () => {
  if (typeof window === 'undefined') return

  try {
    await wagmiConfig.storage?.removeItem('store')
    await wagmiConfig.storage?.removeItem('recentConnectorId')
  } catch {
    // fallback
  }

  removeWagmiLocalStorageKeys()
}

export { ensureWagmiStorageMigrated, WAGMI_STORAGE_VERSION } from '@/utils/wagmiStorageMigration'
