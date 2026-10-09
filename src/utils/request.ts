import axios, { AxiosHeaders } from 'axios'
import getConfig from 'next/config'
import { i18n } from '@lingui/core'
import { toast } from 'react-toastify'
import { t } from '@lingui/macro'
import PubSub from 'pubsub-js'
import { store } from '@/stores'
import { initializeStore } from '@/stores'
import {
  buildKeys,
  extractApiPath,
  formatErr,
  H5_LOG_TAGS,
  h5Logger,
  sanitizeRequestId,
} from '@/utils/h5Logger'
import { isDeBoxApp } from '@/utils/wagmiConnector'
import {
  beginWebsiteTokenReauth,
  completeWebsiteTokenReauth,
  shouldDeferWebsiteTokenExpiredLogout,
} from '@/utils/websiteTokenReauth'
const { publicRuntimeConfig } = getConfig()
// 添加这两行防抖控制变量
let tokenExpiredTimer: ReturnType<typeof setTimeout> | null = null
let isTokenExpiredHandling = false
// 检查是否在客户端环境
const isClient = typeof window !== 'undefined'

const service = axios.create({
  baseURL: publicRuntimeConfig.api.base,
  timeout: 6000,
})

// 处理登录过期的函数
const handleLoginExpired = async () => {
  if (!isClient) return

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Request] handleLoginExpired triggered → walletStore.reset()', {
      stack: new Error().stack?.split('\n').slice(2, 8).join('\n'),
    })
  }

  try {
    completeWebsiteTokenReauth()
    const store = initializeStore()
    // 清除用户信息
    store.walletStore?.reset()

    // 触发钱包断连事件
    PubSub.publish('disconnectWallets')
  } catch (e) {
    h5Logger.log(
      H5_LOG_TAGS.LoginToken,
      'e',
      buildKeys({
        event: 'token_expired_handle',
        ok: false,
        err: formatErr(e, 'handle_failed'),
      })
    )
  }
}

service.interceptors.request.use(
  (config) => {
    if (!config?.headers) {
      config = config || {}
      config.headers = new AxiosHeaders()
    }
    config.headers['language'] =
      i18n?.locale === 'korean'
        ? 'ko'
        : i18n?.locale === 'vietnamese'
        ? 'vi'
        : i18n?.locale === 'japanese'
        ? 'ja'
        : i18n?.locale || 'en'
    config.headers['sversion'] = 1014

    try {
      const { token, deviceId, userId } = store?.walletStore?.curUserInfo || {}

      if (token && userId) {
        config.headers['token'] = token
        config.headers['userId'] = userId
      }
      deviceId && (config.headers['deviceId'] = deviceId)
    } catch (e) {}

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response) => {
    // Token 过期 刷新页面会走登录checkLogin的逻辑 token 失效  || response?.data?.code === -2018 || response?.data?.code === -2023
    if (
      response?.data?.code === -2007 ||
      response?.data?.code === -2018 ||
      response?.data?.code === -2023
    ) {
      // 防抖控制：如果已经在处理中，直接跳过   避免短时间多次触发
      if (isTokenExpiredHandling) {
        return response
      }

      // 清除之前可能存在的定时器
      if (tokenExpiredTimer) {
        clearTimeout(tokenExpiredTimer)
      }

      // 标记开始处理
      isTokenExpiredHandling = true
      const expireCode = response?.data?.code
      const expirePath = extractApiPath(response?.config?.url)
      h5Logger.log(
        H5_LOG_TAGS.LoginToken,
        'e',
        buildKeys({
          event: 'check_token',
          ok: false,
          code: expireCode,
          path: expirePath,
          request_id: sanitizeRequestId(response?.data?.request_id),
        })
      )

      const deferInDeBox = shouldDeferWebsiteTokenExpiredLogout({
        isDeBoxApp: isDeBoxApp(),
        code: expireCode,
      })

      if (deferInDeBox) {
        // App WebView：官网 -2007 多为 wallet_token / website_token 域不一致。
        // 先发起换 website_token，超时再清登录态，避免会员页头像闪回默认。
        beginWebsiteTokenReauth({
          publish: (topic) => PubSub.publish(topic),
          onTimeout: () => {
            toast.error(t`Token expired, please login again`)
            void handleLoginExpired()
          },
        })
        // 防抖仅挡短时重复进入；换票 in-flight 由 websiteTokenReauth 自己去重
        setTimeout(() => {
          isTokenExpiredHandling = false
        }, 2000)
        return response
      }

      tokenExpiredTimer = setTimeout(() => {
        toast.error(
          response?.data?.code === -2007
            ? t`Token expired, please login again`
            : response?.data?.code === -2018
            ? t`Your account has logged in on another device, please login again [-2018]`
            : t`Invalid login credentials, please login again [-2023]`
        )
        handleLoginExpired()

        // 2秒后重置标记
        setTimeout(() => {
          isTokenExpiredHandling = false
        }, 2000)
      }, 1000 * 2)
    }

    return response
  },
  (error) => {
    // 取消请求不记，避免轮询/切页噪声
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      return Promise.reject(error)
    }
    const path = extractApiPath(error?.config?.url)
    const method = String(error?.config?.method || '').toUpperCase()
    const status = error?.response?.status
    const code = error?.response?.data?.code
    const hasMessage = Boolean(error?.response?.data?.msg || error?.message)
    h5Logger.log(
      H5_LOG_TAGS.NetReq,
      'e',
      buildKeys({
        event: 'req_done',
        ok: false,
        method: method || undefined,
        path: path || undefined,
        status: status ?? undefined,
        code: code ?? undefined,
        message_present: hasMessage ? true : undefined,
        request_id: sanitizeRequestId(error?.response?.data?.request_id),
      })
    )
    return Promise.reject(error)
  }
)

export default service
