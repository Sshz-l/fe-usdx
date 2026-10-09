import { isDeBoxApp } from '@/utils/wagmiConnector'

/** 发版后 bump，强制清一次历史损坏的 wagmi 持久化（仅首次访问新版本时） */
export const WAGMI_STORAGE_VERSION = '20260612-debox-no-persist'
const WAGMI_STORAGE_VERSION_KEY = 'debox-wagmi-storage-version'

export const removeWagmiLocalStorageKeys = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('wagmi.store')
    localStorage.removeItem('wagmi.recentConnectorId')
  } catch {
    // ignore
  }
}

/**
 * 同步执行：在 createConfig 之前清掉旧版本遗留的损坏 store。
 * 不依赖 wagmiConfig，避免与 connectors 循环引用。
 */
export const ensureWagmiStorageMigrated = () => {
  if (typeof window === 'undefined') return

  try {
    const current = localStorage.getItem(WAGMI_STORAGE_VERSION_KEY)
    if (current !== WAGMI_STORAGE_VERSION) {
      removeWagmiLocalStorageKeys()
      localStorage.setItem(WAGMI_STORAGE_VERSION_KEY, WAGMI_STORAGE_VERSION)
    }

    // DeBox WebView 每次冷启动清 wagmi 持久化，避免 reconnect 恢复 plain connector
    ensureDeBoxWagmiStorageCleared()
  } catch {
    // ignore
  }
}

/** DeBox 内置浏览器禁用 wagmi 持久化重连，启动时清除历史 wagmi.store */
export const ensureDeBoxWagmiStorageCleared = () => {
  if (typeof window === 'undefined' || !isDeBoxApp()) return
  removeWagmiLocalStorageKeys()
}
