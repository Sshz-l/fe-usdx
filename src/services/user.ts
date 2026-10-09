import request from '@/utils/request'
import { getReferer } from '@fe-common/sdk/src/hooks/useRefererUrl'
import FingerprintJS from '@fingerprintjs/fingerprintjs'


const getFingerprintData = async () => {
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  return result.visitorId
}

export const login = async (
  signature: string,
  address: string,
  chainId: number,
  // captcha_verify_param?: string
) => {
  // 登录接口加参数
  // 获取 URL 参数并处理
  const queryParams = new URLSearchParams(window.location.search)
  const queryValue = queryParams.get('ref')
  // 将查询参数安全转换为数字，避免 NaN
  const ref = queryValue ? Number(queryValue) : undefined

  return await request.post('/debox/website/login_new', {
    chain_id: chainId,
    address,
    signature,
    ref,
    // captcha_verify_param,
    invite_url: getReferer(),
  },
    {
      headers: {
        deviceModel: await getFingerprintData(),
      },
    }
  )
}

export const loginBTC = async (
  publicKey: string,
  signature: string,
  address: string,
  // captcha_verify_param?: string
) => {
  return await request.post('/debox/website/btc/login', {
    publicKey,
    address,
    signature,
    // captcha_verify_param,
    invite_url: getReferer(),
  },
    {
      headers: {
        deviceModel: await getFingerprintData(),
      },
    }
  )
}

export const loginSolana = async (
  signature: string,
  address: string,
  // captcha_verify_param?: string
) => {
  return await request.post('/debox/website/solana/login', {
    address,
    signature,
    // captcha_verify_param,
    invite_url: getReferer(),
  },
    {
      headers: {
        deviceModel: await getFingerprintData(),
      },
    }
  )
}

export const loginTron = async (
  signature: string,
  address: string,
  // captcha_verify_param?: string
) => {
  return await request.post('/debox/website/tron/login', {
    address,
    signature,
    // captcha_verify_param,
    invite_url: getReferer(),
  },
    {
      headers: {
        deviceModel: await getFingerprintData(),
      },
    }
  )
}

export const preLogin = async (remoteIp: string, address: `0x${string}`) => {
  return await request.post('/debox/website/sign_message', {
    address,
    remoteIp,
  })
}

export const checkLogin = async () => {
  return await request.post('/debox/website/check_token', {},
    {
      headers: {
        deviceModel: await getFingerprintData(),
      },
    }
  )
}

export const getCancellationList = async () => {
  return await request.get('/debox/website/cancellation/user')
}

export const cancellationUser = async () => {
  return await request.post('/debox/website/user/cancel')
}

export const getUserInfo = async (
  user_id?: string | number,
  gid?: string,
  isInviteCode?: boolean
) => {
  if (!user_id || ['10000', '10001', '10002'].includes(`${user_id}`)) {
    return null
  }
  return await request.post(
    '/debox/website/user_info',
    isInviteCode
      ? {
        gid,
        invite_code: `${user_id}`,
      }
      : {
        user_id: `${user_id}`,
        gid,
      }
  )
}
