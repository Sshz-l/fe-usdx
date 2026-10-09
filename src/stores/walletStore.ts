import { observable, action, makeObservable } from 'mobx'
import getConfig from 'next/config'
import type { UseDisclosureProps } from '@chakra-ui/react'
import * as Sentry from '@sentry/browser'

// ===== 本地存储工具函数和key常量 =====
const isClient = typeof window !== 'undefined'

const setStore = <T>(key: string, value: T): void => {
  if (!isClient) return
  try {
    const storageValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
    localStorage.setItem(key, storageValue)
  } catch (error) {
    console.error('存储数据失败:', error)
  }
}

const getStore = <T>(key: string): T | null => {
  if (!isClient) return null
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  } catch (error) {
    console.error('获取存储数据失败:', error)
    return null
  }
}

const deleteStore = (key: string): void => {
  if (!isClient) return
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('删除存储数据失败:', error)
  }
}

const STORE_KEYS = {
  USER_INFO: 'walletStore.userInfo',
  ACCOUNT_INFO: 'walletStore.accountInfo',
  CHAIN_ID: 'walletStore.defaultChainId',
  LOGIN_STATE: 'walletStore.loginState',
  LOGIN_METHOD: 'walletStore.loginMethod',
} as const
// ===== 本地存储工具函数和key常量 END =====

import { OssStore } from './walletStore/ossStore'

const { publicRuntimeConfig } = getConfig()

export type TAccountInfo = {
  btc?: {
    taproot?: string
    native_seg_wit?: string
    nested_seg_wit?: string
  }
  solana?: string
  address: `0x${string}`
  alias_name: string
  colors: any
  fans_num: number
  follow_num: number
  follow_state: 1 | 2 | 3 | 4 //  1: 我关注了对方; 2: 对方关注了我; 3: 互相关注; 4: 屏蔽
  gagTime: number
  identity: any
  invite_code: string
  is_follow?: 1 | 0
  level: number
  name: string
  pic: string
  rank: number
  role: number
  user_id: number
  moment_num: number
  background_pic?: string
  signature?: string
  private_msg_type?: 0 | 1 | 2 // private_msg_type // 0 只允许我关注的私信 、1： 允许任何人私信、2：不允许任何人私信
  user_label?: string[] | null
  contract_address?: string
  customer?: string
  client_reference_id?: string
  attribute: number
  icons?: {
    bg_color: string
    border: number
    border_color: string
    color: string
    corner_radius: number
    font_size: number
    height: number
    name: string
    text: string
    type: 'image'
    url: string
    width: number
  }[]
  tron?: string
}

type TUserInfo = {
  token?: string
  imToken?: string
  userId?: number
  deviceId?: any
  address?: string
  inviteCode?: string
  theme_id?: string
  chain_id?: number
  name?: string
  loginType?: 'wallet' | 'qrcode'
} | null

export default class WalletStore {
  constructor() {
    makeObservable(this)
  }

  @observable
  oss: Map<0 | 1 | 2 | 'all', OssStore> = new Map()

  getOSS(type?: 0 | 1 | 2) {
    const newType = typeof type === 'undefined' ? 'all' : type
    if (!this.oss.has(newType)) {
      this.oss.set(newType, new OssStore(type))
    }
    return this.oss.get(newType)
  }

  @observable
  curAccountInfo: TAccountInfo | null = null

  @observable
  lastConnectedAddress: string | null = null

  @observable
  curUserInfo: TUserInfo = null

  // EVM 网络类型
  @observable
  defaultChainId = publicRuntimeConfig.defaultChainId

  @observable
  loginLoading = false

  // 当前登录方式（扫码登录时由后端下发，例如 'QR_CODE'）
  // 值为 'QR_CODE' 时，官网前端需要拦截所有链上交互
  // 参考：金标中台官网扫码登录 API §7
  @observable
  loginMethod: string | null = null

  get isQRCodeLogin(): boolean {
    return this.loginMethod === 'QR_CODE'
  }

  // 登录弹窗
  @observable
  connectModal:
    | (UseDisclosureProps & {
        onOpen: (data: any) => void
      })
    | null = null

  // 扫码登录弹窗
  @observable
  qrCodeLoginModal:
    | (UseDisclosureProps & {
        onOpen: () => void
      })
    | null = null

  @action
  setQRCodeLoginModal(
    qrCodeLoginModal:
      | (UseDisclosureProps & {
          onOpen: () => void
        })
      | null
  ) {
    this.qrCodeLoginModal = qrCodeLoginModal
  }

  @action
  hydrate() {
    if (!isClient) return
    try {
      const userInfo = getStore<TUserInfo>(STORE_KEYS.USER_INFO)
      if (userInfo && typeof userInfo.userId !== 'undefined') {
        this.curUserInfo = userInfo
        Sentry.setUser({ id: userInfo.userId })
      }
      const accountInfo = getStore<TAccountInfo>(STORE_KEYS.ACCOUNT_INFO)
      if (accountInfo && typeof accountInfo.user_id !== 'undefined') {
        this.curAccountInfo = accountInfo
      }

      const loginMethod = getStore<string>(STORE_KEYS.LOGIN_METHOD)
      if (loginMethod) {
        this.loginMethod = loginMethod
      }


    } catch (e) {
      console.error('恢复存储数据失败:', e)
      this.reset()
    }
  }

  @action
  setLoginLoading = (loginLoading: boolean) => {
    this.loginLoading = loginLoading
  }

  @action
  setLoginModal(
    connectModal:
      | (UseDisclosureProps & {
          onOpen: (data: any) => void
        })
      | null
  ) {
    this.connectModal = connectModal
  }

  @action
  setDefaultChainId(defaultChainId: string | number) {
    setStore(STORE_KEYS.CHAIN_ID, defaultChainId)
    this.defaultChainId = defaultChainId
  }

  @action
  setLoginMethod(method: string | null) {
    this.loginMethod = method
    if (method) {
      setStore(STORE_KEYS.LOGIN_METHOD, method)
    } else {
      deleteStore(STORE_KEYS.LOGIN_METHOD)
    }
  }

  @action
  setUserInfo(curUserInfo: TUserInfo) {
    this.curUserInfo = curUserInfo
    if (curUserInfo && typeof curUserInfo.userId !== 'undefined') {
      setStore(STORE_KEYS.USER_INFO, curUserInfo)
      Sentry.setUser({ id: curUserInfo.userId })
    } else {
      deleteStore(STORE_KEYS.USER_INFO)
      Sentry.setUser(null)
      // 兜底：当 userInfo 被外部直接置空（绕过 reset）时，同步清理 loginMethod，
      // 防止「token 已清，但 loginMethod 残留 → 误判为扫码登录会话」
      if (this.loginMethod) {
        this.loginMethod = null
        deleteStore(STORE_KEYS.LOGIN_METHOD)
      }
    }
  }

  @action
  setAccountInfo(curAccountInfo: TAccountInfo | null) {
    this.curAccountInfo = curAccountInfo
    if (curAccountInfo && typeof curAccountInfo.user_id !== 'undefined') {
      this.lastConnectedAddress = curAccountInfo.address
      setStore(STORE_KEYS.ACCOUNT_INFO, curAccountInfo)
    } else {
      this.lastConnectedAddress = null
      deleteStore(STORE_KEYS.ACCOUNT_INFO)
    }
  }


  @action
  reset() {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[WalletStore] RESET called', {
        stack: new Error().stack?.split('\n').slice(2, 10).join('\n'),
      })
    }
    this.setUserInfo(null)
    this.setAccountInfo(null)
    this.lastConnectedAddress = null
    deleteStore(STORE_KEYS.USER_INFO)
    deleteStore(STORE_KEYS.ACCOUNT_INFO)
    deleteStore(STORE_KEYS.CHAIN_ID)
    deleteStore(STORE_KEYS.LOGIN_METHOD)
    this.oss.clear()
    this.loginLoading = false
    this.loginMethod = null
  }

  @action
  checkAddressChange(currentAddress: string): boolean {
    if (!this.lastConnectedAddress) return false
    return this.lastConnectedAddress.toLowerCase() !== currentAddress.toLowerCase()
  }
}
