import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useAccount } from 'wagmi'
import PubSub from 'pubsub-js'
import { useQueryClient } from '@tanstack/react-query'

import { useStore } from '@/stores'
import { useLogin } from '@/hooks/useLogin'
import { useWalletDisconnect } from '@/hooks/useWalletDisconnect'
import { useDeBoxSilentReconnect } from '@/hooks/useDeBoxSilentReconnect'
import { PREMIUM_BASIC_INFO_QUERY_KEY } from '@/hooks/usePremiumBasicInfo'
import { getUserInfo } from '@/services/user'
import {
  isManualLogoutPending,
  isValidWalletLogin,
  normalizeAccountAddress,
  resolveEvmWalletIdentity,
  walletIdentityKey,
} from '@/utils/walletIdentity'
import { notifySessionRefresh, SESSION_REFRESH_TOPIC } from '@/utils/sessionRefresh'
import { isDeBoxApp } from '@/utils/wagmiConnector'
import { WEBSITE_TOKEN_REAUTH_TOPIC } from '@/utils/websiteTokenReauth'

type TProps = {
  /** 仅连接 EVM 钱包、不触发 DeBox 账号 preLogin/login（如 USDX 链上 DApp） */
  skipAuthLogin?: boolean
}

const LoginHandler = ({ skipAuthLogin = false }: TProps) => {
  const router = useRouter()
  const { walletStore } = useStore()
  const { disconnectWallets } = useWalletDisconnect()
  const { trySilentReconnect, isReconnecting } = useDeBoxSilentReconnect()
  const queryClient = useQueryClient()

  const [storeReady, setStoreReady] = useState(false)

  const { address, isConnected, status } = useAccount()
  const { loginFn } = useLogin()

  const loginFnRef = useRef(loginFn)
  loginFnRef.current = loginFn

  const prevWalletKeyRef = useRef<string | undefined>()
  const loginAttemptKeyRef = useRef<string | undefined>()
  const deboxReconnectPathRef = useRef<string | undefined>()
  const prevConnectedRef = useRef(false)
  const walletStateRef = useRef({ isConnected, address, isReconnecting })

  walletStateRef.current = { isConnected, address, isReconnecting }

  const attemptDeBoxSilentReconnect = () => {
    if (!isDeBoxApp() || isConnected || isManualLogoutPending()) return
    const hasSession = Boolean(
      walletStore.curUserInfo?.token && walletStore.curAccountInfo?.address
    )
    if (!hasSession) return
    void trySilentReconnect()
  }

  const walletIdentity = useMemo(
    () => resolveEvmWalletIdentity(address, isConnected),
    [address, isConnected]
  )

  const walletKey = walletIdentity ? walletIdentityKey(walletIdentity) : undefined

  useEffect(() => {
    const token = PubSub.subscribe('disconnectWallets', () => {
      disconnectWallets()
    })
    return () => {
      PubSub.unsubscribe(token)
    }
  }, [disconnectWallets])

  useEffect(() => {
    const token = PubSub.subscribe(SESSION_REFRESH_TOPIC, () => {
      void queryClient.invalidateQueries({ queryKey: PREMIUM_BASIC_INFO_QUERY_KEY })
      void queryClient.refetchQueries({ queryKey: PREMIUM_BASIC_INFO_QUERY_KEY })
    })
    return () => {
      PubSub.unsubscribe(token)
    }
  }, [queryClient])

  // App WebView：官网 -2007 后由 request 拦截器发起换 website_token
  useEffect(() => {
    if (!isDeBoxApp()) return
    const token = PubSub.subscribe(WEBSITE_TOKEN_REAUTH_TOPIC, () => {
      if (walletStore.loginLoading) return
      if (isManualLogoutPending()) return
      void loginFnRef.current?.().catch((e) => {
        console.error('Website token reauth login failed:', e)
      })
    })
    return () => {
      PubSub.unsubscribe(token)
    }
  }, [walletStore])

  // token 已存在但账户信息缺失时，补拉用户信息（避免签名后 UI 空白）
  useEffect(() => {
    if (!storeReady || walletStore.loginLoading) return

    const userId = walletStore.curUserInfo?.userId
    const hasToken = Boolean(walletStore.curUserInfo?.token)
    const hasAccountAddress = Boolean(walletStore.curAccountInfo?.address)

    if (!hasToken || hasAccountAddress || !userId) {
      return
    }

    let cancelled = false

    void getUserInfo(userId)
      .then((response) => {
        if (cancelled || response?.data?.code < 0 || !response?.data?.data) {
          return
        }

        const normalizedAddress = normalizeAccountAddress(
          response.data.data,
          resolveEvmWalletIdentity(address, isConnected)?.address
        )

        if (!normalizedAddress) {
          return
        }

        walletStore.setAccountInfo({
          ...response.data.data,
          address: normalizedAddress as `0x${string}`,
        })
        notifySessionRefresh()
      })
      .catch((error) => {
        console.error('Failed to hydrate account info after login:', error)
      })

    return () => {
      cancelled = true
    }
  }, [
    storeReady,
    walletStore,
    walletStore.loginLoading,
    walletStore.curUserInfo?.token,
    walletStore.curUserInfo?.userId,
    walletStore.curAccountInfo?.address,
    address,
    isConnected,
  ])

  useEffect(() => {
    if (!walletStore) return
    setStoreReady(true)
    if (typeof window !== 'undefined' && walletStore.hydrate) {
      walletStore.hydrate()
    }
  }, [walletStore])

  // DeBox：wagmi 意外断开（如 getChainId 兜底）时允许同一路由再次静默重连
  useEffect(() => {
    if (!storeReady || !isDeBoxApp()) return

    const wasConnected = prevConnectedRef.current
    prevConnectedRef.current = isConnected

    if (wasConnected && !isConnected) {
      deboxReconnectPathRef.current = undefined
      attemptDeBoxSilentReconnect()
    }
  }, [storeReady, isConnected])

  // DeBox：页面加载/路由切换后静默重连（wagmi 不持久化，manage 等子页依赖连接态）
  useEffect(() => {
    if (!storeReady || !isDeBoxApp() || isConnected) return
    if (isReconnecting) return

    const pathKey = router.asPath
    if (deboxReconnectPathRef.current === pathKey) return
    deboxReconnectPathRef.current = pathKey

    attemptDeBoxSilentReconnect()
  }, [
    storeReady,
    router.asPath,
    isConnected,
    walletStore.curUserInfo?.token,
    walletStore.curAccountInfo?.address,
    trySilentReconnect,
    isReconnecting,
  ])

  // 钱包断开或 address 不一致时清除无效会话，仅保留「已连接 + address 匹配」的有效登录
  useEffect(() => {
    if (!storeReady || walletStore.loginLoading) return
    if (isReconnecting) return
    if (status === 'connecting' || status === 'reconnecting') return

    // 扫码登录会话不走钱包连接校验：钱包未连也属于有效状态
    // 参考：金标中台官网扫码登录 API §7
    if (walletStore.isQRCodeLogin) return

    const hasToken = Boolean(walletStore.curUserInfo?.token)
    const hasAccountAddress = Boolean(walletStore.curAccountInfo?.address)
    const hasSession = hasToken && hasAccountAddress

    // 签名登录过程中：token 可能已写入，但账户信息尚未补齐
    if (hasToken && !hasAccountAddress) {
      return
    }

    if (!hasSession) return

    const cleanupDelayMs = isDeBoxApp() ? 3500 : 2000

    const timer = setTimeout(async () => {
      const latest = walletStateRef.current
      if (latest.isReconnecting) return

      const valid = isValidWalletLogin({
        isConnected: latest.isConnected,
        address: latest.address,
        curUserInfo: walletStore.curUserInfo,
        curAccountInfo: walletStore.curAccountInfo,
      })

      if (valid) return

      if (isDeBoxApp()) {
        const reconnected = await trySilentReconnect()
        if (reconnected) return
      }

      walletStore.reset()
      deboxReconnectPathRef.current = undefined
      void queryClient.removeQueries({ queryKey: PREMIUM_BASIC_INFO_QUERY_KEY })
      prevWalletKeyRef.current = undefined
      loginAttemptKeyRef.current = undefined
    }, cleanupDelayMs)

    return () => clearTimeout(timer)
  }, [
    storeReady,
    isConnected,
    address,
    walletStore,
    walletStore.curUserInfo?.token,
    walletStore.curAccountInfo?.address,
    walletStore.loginLoading,
    queryClient,
    trySilentReconnect,
    isReconnecting,
    status,
  ])

  // EVM 连接稳定后触发自动登录（USDX 等纯链上页跳过）
  useEffect(() => {
    if (!storeReady || skipAuthLogin) return

    if (!walletKey || !walletIdentity) {
      prevWalletKeyRef.current = undefined
      loginAttemptKeyRef.current = undefined
      return
    }

    if (
      isValidWalletLogin({
        isConnected,
        address,
        curUserInfo: walletStore.curUserInfo,
        curAccountInfo: walletStore.curAccountInfo,
      })
    ) {
      prevWalletKeyRef.current = walletKey
      loginAttemptKeyRef.current = undefined
      return
    }

    if (walletStore.loginLoading) return
    if (isDeBoxApp() && isManualLogoutPending()) return

    const addressChanged =
      prevWalletKeyRef.current != null && prevWalletKeyRef.current !== walletKey
    prevWalletKeyRef.current = walletKey

    if (loginAttemptKeyRef.current === walletKey) return
    loginAttemptKeyRef.current = walletKey

    const loginTimer = setTimeout(() => {
      loginFnRef.current?.()
        .catch((e) => console.error('Auto login failed:', e))
        .finally(() => {
          const loggedIn = isValidWalletLogin({
            isConnected,
            address,
            curUserInfo: walletStore.curUserInfo,
            curAccountInfo: walletStore.curAccountInfo,
          })
          if (!loggedIn) {
            loginAttemptKeyRef.current = undefined
          }
        })
    }, addressChanged ? 500 : 300)

    return () => clearTimeout(loginTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storeReady,
    skipAuthLogin,
    walletKey,
    walletIdentity,
    isConnected,
    address,
    walletStore.curUserInfo?.token,
    walletStore.curAccountInfo?.address,
    walletStore.loginLoading,
  ])

  return null
}

export default LoginHandler
