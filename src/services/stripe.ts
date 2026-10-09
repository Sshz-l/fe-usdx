import request from '@/utils/request'

export async function getStripePro() {
  return request.get('/debox/stripe/products')
}

export async function postSession(data: {
  price_id: string
  customer?: string
  client_reference_id?: string
}) {
  return request.post('/debox/website/stripe/checkout_session', data)
}

export async function postApply(data: {
  Type: number
  customer?: string
  green_mark_address?: string
  organization_name?: string
  organization_email?: string
  organization_website?: string
  applicant_name?: string
  applicant_type?: string
  sync_twitter?: number
  twitter_user_name?: string
}) {
  return request.post('/debox/website/stripe/commit_apply', data)
}

export async function postWebhook(data: {
  price_id: string
  customer?: string
  client_reference_id?: string
}) {
  return request.post('/debox/website/stripe/webhook', data)
}

export async function getOrderList() {
  return request.get('/debox/website/stripe/my_order_list')
}



// 新版会员支付页 premiums
//获取授权支付套餐配置
export async function getPayConfig() {
  return request.get('/debox/website/authorized_user/v2/pay/config')
}

// 生成授权支付链上交易签名参数
/**
 * AuthorizationPaySignReq
 */
export interface GetPaySignRequest {
  /**
   * 套餐 key。
   * 目前支持：
   * - iron-monthly / iron-quarterly / iron-yearly
   * - green-monthly / green-quarterly / green-yearly
   * - gold-monthly / gold-quarterly / gold-yearly
   */
  key: string;
  /**
   * 支付代币，支持 `usdt` 或 `box`，空值默认 `usdt`
   */
  pay_token?: PayToken;
  [property: string]: any;
}

/**
* 支付代币，支持 `usdt` 或 `box`，空值默认 `usdt`
*/
export enum PayToken {
  Box = "box",
  Usdt = "usdt",
}
export async function getPaySign(data: GetPaySignRequest) {
  return request.post(`/debox/website/authorized_user/v2/pay/sign`, data)
}

export type GetPremiumGiftSignRequest = {
  key: string
  pay_token?: PayToken
  target_address: string
}

/** 赠送会员链上支付签名（不复用自购 pay/sign） */
export async function getPremiumGiftSign(data: GetPremiumGiftSignRequest) {
  return request.post('/debox/website/authorized_user/v2/pay/gift/sign', data)
}

export interface GetComponentPayRequest {
  project: string
  key: string
}

// 通用支付面板接口（按 project + key 查询）
export async function getComponentPay(params: GetComponentPayRequest) {
  return request.get('/debox/website/v1/payment/component', { params })
}

// 获取授权用户基础信息（Website）
export async function getBasicInfo() {
  return request.get(`/debox/website/authorized_user/v1/basic-info`)
}

// 获取购买记录，获取授权支付历史
export interface Request {
  /**
   * 每页条数，默认 20，最大 50
   */
  page_size?: number;
  /**
   * 翻页游标，留空表示首页
   */
  page_token?: string;
  [property: string]: any;
}
export async function getPayHistory(params: Request) {
  return request.get('/debox/website/authorized_user/v1/pay/history', { params })
}