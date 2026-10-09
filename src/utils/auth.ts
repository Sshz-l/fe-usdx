import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

// 获取用户认证信息的函数
export const getUserAuthHeaders = (customHeaders?: Record<string, string>) => {
  // 如果外部传入了自定义请求头，优先使用
  if (customHeaders && Object.keys(customHeaders).length > 0) {
    return customHeaders
  }

  try {
    // 从配置中获取钱包存储键名，如果没有配置则使用默认值
    const walletStoreKey = publicRuntimeConfig.walletStoreKey || 'walletStore.userInfo'
    
    // 从localStorage获取用户信息
    const userInfoStr = localStorage.getItem(walletStoreKey)
    if (!userInfoStr) return {}

    const userInfo = JSON.parse(userInfoStr)
    const { token, userId } = userInfo || {}
    const headers: Record<string, string> = {}

    if (token && userId) {
      headers['token'] = token
      headers['userId'] = userId
      headers['source'] = 'website'
    }

    return headers
  } catch (error) {
    console.error('获取用户认证信息失败:', error)
    return {}
  }
}

// 获取用户信息的函数（用于其他用途）
export const getUserInfo = (walletStoreKey?: string) => {
  try {
    const key = walletStoreKey || publicRuntimeConfig.walletStoreKey || 'walletStore.userInfo'
    const userInfoStr = localStorage.getItem(key)
    if (!userInfoStr) return null
    return JSON.parse(userInfoStr)
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
} 