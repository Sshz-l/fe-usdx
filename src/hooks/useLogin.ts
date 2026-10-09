import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { toast } from 'react-toastify'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDisconnect as useBTCDisconnect } from '@fe-common/sdk/src/hooks/btc/useDisconnect'
import { preLogin, login, checkLogin, getUserInfo } from '@/services/user'
import { useStore } from '@/stores'
import { PREMIUM_BASIC_INFO_QUERY_KEY } from '@/hooks/usePremiumBasicInfo'
import {
  addressesMatchStored,
  clearManualLogoutPending,
  isUserRejectedWalletError,
  markManualLogoutPending,
  normalizeAccountAddress,
  resolveEvmWalletIdentity,
} from '@/utils/walletIdentity'
import { notifySessionRefresh } from '@/utils/sessionRefresh'
import { isDeBoxApp } from '@/utils/wagmiConnector'
import { buildKeys, formatErr, H5_LOG_TAGS, h5Logger } from '@/utils/h5Logger'
import {
  completeWebsiteTokenReauth,
  shouldClearSessionBeforeWebsiteRelogin,
} from '@/utils/websiteTokenReauth'
// 扩展StorageEvent接口，添加source属性（非标准属性，用于标识触发事件的窗口）
declare global {
    interface StorageEvent {
        source?: Window
    }
}

// 跨页面登录控制的localStorage键，与walletStore保持一致的命名规则
const LOGIN_IN_PROGRESS_KEY = 'walletStore.loginInProgress'
const LAST_LOGIN_TIME_KEY = 'walletStore.lastLoginTime'
const LOGIN_LOCK_TIMESTAMP_KEY = 'walletStore.loginLockTimestamp'
const LOGIN_LOCK_TTL_MS = 30 * 1000

export const useLogin = () => {
  const { walletStore } = useStore()
  const queryClient = useQueryClient()
  const { chain, address, isConnected } = useAccount()

  const refreshPremiumBasicInfo = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: PREMIUM_BASIC_INFO_QUERY_KEY })
    void queryClient.refetchQueries({ queryKey: PREMIUM_BASIC_INFO_QUERY_KEY })
    notifySessionRefresh()
  }, [queryClient])

  const { signMessageAsync } = useSignMessage()
  const { disconnect: disconnectBTC } = useBTCDisconnect()
  const { disconnectAsync, connectors, disconnect } = useDisconnect()
  const { disconnect: disconnectSolana, select: selectSolana } = useSolanaWallet()
  
  // 监听localStorage变化，实现跨页面登录状态同步
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 只处理本窗口之外的localStorage变化
      if (e.source === window) return
      
      // 监听walletStore使用的键名
      const WALLET_STORE_USER_INFO_KEY = 'walletStore.userInfo'
      const WALLET_STORE_ACCOUNT_INFO_KEY = 'walletStore.accountInfo'
      
      // 处理用户信息变化
      if (e.key === WALLET_STORE_USER_INFO_KEY && e.newValue) {
        try {
          const userInfo = JSON.parse(e.newValue)
          walletStore.setUserInfo(userInfo)
          refreshPremiumBasicInfo()
        } catch (error) {
          console.error('解析用户信息失败:', error)
        }
      } else if (e.key === WALLET_STORE_USER_INFO_KEY && e.newValue === null) {
        // 用户登出
        walletStore.reset()
      }
      
      // 处理账户信息变化
      if (e.key === WALLET_STORE_ACCOUNT_INFO_KEY && e.newValue) {
        try {
          const accountInfo = JSON.parse(e.newValue)
          walletStore.setAccountInfo(accountInfo)
        } catch (error) {
          console.error('解析账户信息失败:', error)
        }
      }
    }
    
    // 添加localStorage事件监听器
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      // 清理事件监听器
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [walletStore, refreshPremiumBasicInfo])

  // 登出
  const logoutFn = async () => {
    try {
      // 清除所有连接
      if (connectors.length) {
        const disconnectArr: any[] = []
        disconnectArr.push(disconnectAsync().catch((e) => console.log('connectors', e)))
        connectors?.forEach((c) => {
          disconnectArr.push(
            disconnectAsync({ connector: c }).catch((e) => console.log('connectors', e))
          )
        })
        await Promise.all(disconnectArr).catch((e) => console.log('connectors', e))
      }
      disconnect()
      disconnectBTC()
      disconnectSolana?.()
      selectSolana(null)
      
      // 重置状态，walletStore.reset()方法会自动处理localStorage的清除
      walletStore.reset()
      queryClient.removeQueries({ queryKey: PREMIUM_BASIC_INFO_QUERY_KEY })
      localStorage.removeItem(LAST_LOGIN_TIME_KEY)
      localStorage.removeItem(LOGIN_IN_PROGRESS_KEY)
      localStorage.removeItem(LOGIN_LOCK_TIMESTAMP_KEY)
      if (isDeBoxApp()) {
        markManualLogoutPending()
      }
    } catch (e) {
      console.error('登出失败:', e)
    }
  }

  // 登录
  const loginFn = async () => {
    const clearLoginLock = () => {
      localStorage.removeItem(LOGIN_IN_PROGRESS_KEY)
      localStorage.removeItem(LOGIN_LOCK_TIMESTAMP_KEY)
    }

    const currentTime = Date.now()

    // 1. 检查当前页面是否已有登录请求在进行
    if (walletStore.loginLoading) {
      return
    }

    // 2. 检查浏览器中是否有其他页面正在登录（跨页面控制）
    const isLoginInProgress = localStorage.getItem(LOGIN_IN_PROGRESS_KEY)
    const lockTimestampStr = localStorage.getItem(LOGIN_LOCK_TIMESTAMP_KEY)
    const lockTimestamp = lockTimestampStr ? Number(lockTimestampStr) : 0
    const lockIsValid = currentTime - lockTimestamp < LOGIN_LOCK_TTL_MS
    if (isLoginInProgress === 'true' && lockIsValid) {
      return
    }
    if (isLoginInProgress === 'true' && !lockIsValid) {
      clearLoginLock()
    }

    // 3. 检查时间间隔（使用localStorage存储，跨页面共享）
    const lastLoginTimeStr = localStorage.getItem(LAST_LOGIN_TIME_KEY)
    const lastLoginTime = lastLoginTimeStr ? parseInt(lastLoginTimeStr, 10) : 0
    if (currentTime - lastLoginTime < 1500) {
      return
    }

    // 4. 设置登录中标志
    walletStore.setLoginLoading(true)
    localStorage.setItem(LOGIN_IN_PROGRESS_KEY, 'true')
    localStorage.setItem(LOGIN_LOCK_TIMESTAMP_KEY, currentTime.toString())

    try {
      const walletIdentity = resolveEvmWalletIdentity(address, isConnected)

      const hasValidToken = walletStore.curUserInfo?.token
      const addressesMatch =
        hasValidToken &&
        addressesMatchStored(walletStore.curAccountInfo?.address, walletIdentity)

      if (addressesMatch) {
        const checkLoginRes = await checkLogin()
        const isLoginValid = checkLoginRes?.data?.code >= 0 && checkLoginRes.data?.data === true

        if (isLoginValid && walletStore.curUserInfo?.userId) {
          if (!walletStore.curAccountInfo) {
            const userInfoRes = await getUserInfo(walletStore.curUserInfo.userId)
            if (userInfoRes?.data?.code < 0) {
              throw new Error(userInfoRes?.data?.msg || '获取用户信息失败')
            }
            const account = userInfoRes?.data?.data
            if (!account) {
              throw new Error(userInfoRes?.data?.msg || '获取用户信息失败')
            }
            const normalizedAddress = normalizeAccountAddress(account, walletIdentity?.address)
            walletStore.setAccountInfo({
              ...account,
              address: normalizedAddress as `0x${string}`,
            })
          }
          completeWebsiteTokenReauth()
          refreshPremiumBasicInfo()
          clearManualLogoutPending()
          return
        }

        // App WebView：check_token 失败通常是 wallet_token 不能当 website_token 用。
        // 保留本地资料，继续 preLogin → login_new 换真正的 website_token。
        if (
          shouldClearSessionBeforeWebsiteRelogin({
            isDeBoxApp: isDeBoxApp(),
            checkTokenFailed: true,
            addressMismatch: false,
          })
        ) {
          walletStore.reset()
        } else {
          h5Logger.log(
            H5_LOG_TAGS.LoginToken,
            'w',
            buildKeys({
              event: 'website_token_relogin',
              ok: false,
              code: checkLoginRes?.data?.code,
            })
          )
        }
      } else {
        if (
          walletStore.curAccountInfo?.address &&
          walletIdentity &&
          !addressesMatchStored(walletStore.curAccountInfo.address, walletIdentity)
        ) {
          console.error('Wallet address changed, clearing session:', {
            oldAddress: walletStore.curAccountInfo.address,
            newAddress: walletIdentity.address,
          })
        }
        if (
          (walletStore.curUserInfo?.token || walletStore.curAccountInfo?.address) &&
          shouldClearSessionBeforeWebsiteRelogin({
            isDeBoxApp: isDeBoxApp(),
            checkTokenFailed: false,
            addressMismatch: true,
          })
        ) {
          walletStore.reset()
        }
      }

      const loginAddress = walletIdentity?.address

      if (!loginAddress || !walletIdentity || !address) {
        throw new Error('未检测到 EVM 钱包地址')
      }

      const res = await preLogin('', loginAddress as `0x${string}`)
      if (res.data?.code < 0) {
        throw new Error(res?.data?.msg)
      }

      const message = res?.data?.data
      const sign = await signMessageAsync({ message })

      if (!sign) {
        throw new Error('签名消息失败')
      }

      const loginRes = await login(sign, address as `0x${string}`, chain?.id as number)

      if (loginRes.data?.code < 0) {
        throw new Error(loginRes?.data?.msg)
      }

      // 10. 设置用户基本信息
      const userData = loginRes?.data?.data
      const userInfo = {
        token: userData?.token,
        userId: userData?.user_id,
        deviceId: userData?.deviceId,
      }
      // walletStore.setUserInfo会自动将用户信息写入localStorage
      walletStore.setUserInfo(userInfo)

      // 11. 获取并设置完整用户信息
      const fullUserInfo = await getUserInfo(userInfo.userId)
      if (fullUserInfo?.data?.code < 0) {
        throw new Error(fullUserInfo?.data?.msg || '获取用户信息失败')
      }
      const accountInfo = fullUserInfo?.data?.data
      if (!accountInfo) {
        throw new Error(fullUserInfo?.data?.msg || '获取用户信息失败')
      }
      const normalizedAddress = normalizeAccountAddress(accountInfo, loginAddress)
      walletStore.setAccountInfo({
        ...accountInfo,
        address: normalizedAddress as `0x${string}`,
      })
      completeWebsiteTokenReauth()
      refreshPremiumBasicInfo()
      clearManualLogoutPending()
      // 12. 更新最后登录时间（使用localStorage，跨页面共享）
      localStorage.setItem(LAST_LOGIN_TIME_KEY, currentTime.toString())
    } catch (e: any) {
      const code = e?.code ?? e?.cause?.code
      const msg = String(e?.shortMessage ?? e?.message ?? e?.cause?.message ?? '')
      const userRejected = isUserRejectedWalletError(e) || code === 4001 || /user rejected|rejected|denied/i.test(msg)
      if (!userRejected) {
        toast.error(e?.message)
        h5Logger.log(
          H5_LOG_TAGS.LoginAccount,
          'e',
          buildKeys({
            event: 'login_fail',
            chain: chain?.id,
            err: formatErr(e, 'login_fail'),
          })
        )
      }
      // 用户拒绝签名时不要自动断开/登出，否则会触发 LoginHandler 自动重连/自动登录导致循环弹窗
      // 仅在没有有效token且非“用户拒绝”时执行登出，避免覆盖已有登录状态
      if (!userRejected && !walletStore.curUserInfo?.token) {
        logoutFn()
      }
    } finally {
      // 13. 清除登录中标志
      walletStore.setLoginLoading(false)
      clearLoginLock()
    }
  }

  return {
    loginFn,
    logoutFn,
  }
}
