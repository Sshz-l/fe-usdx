import { makeObservable, action, observable } from 'mobx'
import { checkQRCodeStatus, generateECDHKey } from '@/services/qrcode'
import { store } from '@/stores'

// 二维码状态枚举
export type QRCodeStatus = 'pending' | 'scaned' | 'confirmed' | 'expired'

// 用户登录数据接口
interface QRCodeLoginData {
  token?: string
  jim_token?: string
  im_token?: string
  user_id?: number
  address?: string
  invite_code?: string
  name?: string
  login_method?: string
}

class QRCodeStore {
  // 当前二维码ID
  @observable
  tempCodeId: string = ''

  // 二维码状态
  @observable
  status: QRCodeStatus = 'pending'

  // 剩余时间
  @observable
  expireTime: number = 60

  // 操作类型（login 或 exchange）
  @observable
  type: string = 'login'

  // 轮询定时器
  pollTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    makeObservable(this)
  }

  // 重置状态
  @action
  reset = () => {
    this.tempCodeId = ''
    this.status = 'pending'
    this.expireTime = 60
    this.stopPolling()
  }

  // 设置二维码ID
  @action
  setTempCodeId = (tempCodeId: string) => {
    this.tempCodeId = tempCodeId
  }

  // 设置状态
  @action
  setStatus = (status: QRCodeStatus) => {
    this.status = status
  }

  // 设置剩余时间
  @action
  setExpireTime = (expireTime: number) => {
    this.expireTime = expireTime
  }

  // 设置操作类型
  @action
  setType = (type: string) => {
    this.type = type
  }

  // 销毁
  destroy = () => {
    this.stopPolling()
    this.reset()
  }

  // 停止轮询
  @action
  stopPolling = () => {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  // 获取登录用户信息并完成登录
  @action
  fetchAndDecryptQRCodeLogin = async (onClose: () => void): Promise<void> => {
    if (!this.tempCodeId) return

    try {
      const response = await generateECDHKey({ temp_code_id: this.tempCodeId, type: this.type })
      // 参考：金标中台官网扫码登录 API §6 — code === 1 才算成功
      if (response?.data?.code !== 1) {
        return
      }
      if (response && response.data && response.data.data) {
        const encryptedData = response.data.data.code
        if (!encryptedData) return

        // 解析加密的用户数据
        // 参考：金标中台官网扫码登录 API §6
        // 响应外层 data.code 是序列化 JSON 字符串，二次 parse 后字段平铺：
        //   { user_id, token, im_token, jim_token, login_method, ... }
        // 兼容老 PC/Desk 的 { data: {...} } 结构：两个分支都能取到
        let userData: QRCodeLoginData | undefined
        try {
          const info = JSON.parse(encryptedData)
          userData = (info?.data && typeof info.data === 'object') ? info.data : info
        } catch (e) {
          return
        }

        // 必须有 user_id 才能认定登录成功
        if (!userData?.user_id) {
          return
        }

        // 记录扫码登录方式（官网扫码固定为 QR_CODE），用于后续链上操作拦截
        // 参考：金标中台官网扫码登录 API §7
        if (userData.login_method) {
          store?.walletStore?.setLoginMethod?.(userData.login_method)
        }

        // 设置用户信息
        store?.walletStore?.setUserInfo({
          token: userData.token || '',
          userId: userData.user_id,
        })
        store?.walletStore?.setAccountInfo({
          address: (userData.address || '') as `0x${string}`,
          invite_code: userData.invite_code || '',
          alias_name: userData.name || '',
          user_id: userData.user_id || 0,
          name: userData.name || '',
          pic: '',
          level: 0,
          fans_num: 0,
          follow_num: 0,
          follow_state: 4 as const,
          gagTime: 0,
          identity: null,
          rank: 0,
          role: 0,
          moment_num: 0,
          colors: null,
          attribute: 0,
        })

        // 关闭弹窗
        onClose()

        // 延迟刷新页面，等待 UI 更新完成
        setTimeout(() => {
          window.location.reload()
        }, 800)
      }
    } catch {
      // ignore
    }
  }

  // 开始轮询
  @action
  startPolling = (tempCodeId: string, onConfirmed: () => void) => {
    this.stopPolling()
    this.tempCodeId = tempCodeId

    this.pollTimer = setInterval(async () => {
      try {
        if (!tempCodeId) return
        const response = await checkQRCodeStatus(tempCodeId, this.type)
        if (response && response.data && response.data.data) {
          const apiStatus = response.data.data.status as string
          const status = (apiStatus || 'expired') as 'pending' | 'scaned' | 'confirmed' | 'expired'
          this.setStatus(status)
          this.setExpireTime(response.data.data.expire_time || 0)

          if (status === 'confirmed') {
            this.stopPolling()
            // confirmed 后获取登录信息并关闭弹窗
            await this.fetchAndDecryptQRCodeLogin(onConfirmed)
            return
          }

          if (status === 'expired' || apiStatus === '') {
            this.stopPolling()
          }
        }
      } catch {
        this.stopPolling()
      }
    }, 2000)
  }
}

export default QRCodeStore