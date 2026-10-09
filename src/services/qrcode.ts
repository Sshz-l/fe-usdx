import request from '@/utils/request'

// 生成二维码的响应类型
export interface GenerateQRCodeResponse {
  data: {
    code: number
    data: {
      temp_code_id: string
      expire_time: number
    }
    request_id: string
    success: boolean
  }
  status: number
  statusText: string
  headers: Record<string, string>
  config: Record<string, any>
  request: Record<string, any>
}

// 检查二维码状态的响应类型
export interface CheckQRCodeResponse {
  data: {
    code: number
    data: {
      status: 'pending' | 'scaned' | 'confirmed' | 'expired' | ''
      expire_time: number
    }
    request_id: string
    success: boolean
  }
  status: number
  statusText: string
  headers: Record<string, string>
  config: Record<string, any>
  request: Record<string, any>
}

// 设置二维码状态的请求参数
export interface SetQRCodeStatusParams {
  temp_code_id: string
  status: 'scaned' | 'confirmed'
  encrypted_ecdh_key?: string
  type?: string
}

// 设置二维码状态的响应类型
export interface SetQRCodeStatusResponse {
  data: {
    code: number
    data: Record<string, any>
    request_id: string
    success: boolean
  }
  status: number
  statusText: string
  headers: Record<string, string>
  config: Record<string, any>
  request: Record<string, any>
}

// ECDH Key 响应类型
export interface GenerateECDHKeyResponse {
  data: {
    code: number
    data: {
      code: string // 加密的用户数据 JSON 字符串
    }
    request_id: string
    success: boolean
  }
  status: number
  statusText: string
  headers: Record<string, string>
  config: Record<string, any>
  request: Record<string, any>
}

/**
 * 生成二维码
 * @param type 二维码类型，用于标记扫码用途（登录传 'login'）
 * @param source 登录来源：官网传 0（旧 PC/Desk 不传）；其他值暂不支持
 * @returns 二维码ID和过期时间
 *
 * 参考文档：金标中台官网扫码登录 API §3
 *   - 路径：GET /debox/website/user/qrcode/generate（website 前缀）
 *   - 官网 + type=login → 必须显式传 source=0，后端走 uid_website_* 链路
 *   - 旧 PC/Desk → 不传 source，走 uid_web_* 链路
 */
export const generateQRCode = async (
  type: string = 'exchange_ecdh_key',
  source?: number
): Promise<GenerateQRCodeResponse> => {
  const params: Record<string, string | number> = { type }
  if (typeof source === 'number') {
    params.source = source
  }
  return await request.get('debox/website/user/qrcode/generate', {
    params
  })
}

/**
 * 检查二维码状态
 * @param temp_code_id 二维码ID
 * @returns 二维码状态和剩余时间
 *
 * 参考文档：金标中台官网扫码登录 API §4
 *   - 路径：GET /debox/website/user/qrcode/status/check
 *   - 查询参数：type=login, temp_code_id
 */
export const checkQRCodeStatus = async (temp_code_id: string, type: string): Promise<CheckQRCodeResponse> => {
  return await request.get('debox/website/user/qrcode/status/check', {
    params: { temp_code_id, type }
  })
}

/**
 * 设置二维码状态
 * @param params 状态参数
 */
export const setQRCodeStatus = async (params: SetQRCodeStatusParams): Promise<SetQRCodeStatusResponse> => {
  return await request.post('debox/desk/user/qrcode/status/set', params)
}

/**
 * 获取一次性扫码登录结果（confirmed 后调用，结果只能取一次）
 * @param temp_code_id 二维码ID
 * @param type 类型（登录固定 'login'）
 *
 * 参考：金标中台官网扫码登录 API §6
 *   - 路径：POST /debox/website/user/qrcode/generate-ecdh-key（website 路径前缀 + 中划线）
 *   - body: { type: 'login', temp_code_id }
 *   - 响应 data.code 是序列化 JSON 字符串，parse 后字段平铺
 */
export const generateECDHKey = async (params: { temp_code_id: string; type?: string }): Promise<GenerateECDHKeyResponse> => {
  return await request.post('debox/website/user/qrcode/generate-ecdh-key', params)
}