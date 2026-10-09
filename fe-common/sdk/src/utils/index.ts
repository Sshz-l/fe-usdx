import { defaultConf } from '../constants/config'

export * as gtag from './gtag'
export * from './cookie'
export * from './localStorage'
export * from './math'
export { px2vh } from './px2vh'
export { px2vw } from './px2vw'
export { getValidatorURL } from './validatorURL'

/**
 * 暂停
 * @param timer 时间戳
 * @returns
 */
export const sleep = (timer = 1000) => {
  return new Promise((r) => {
    setTimeout(() => {
      r('ok')
    }, timer)
  })
}

/**
 * 等待合约上链执行
 * @param fn 合约实例执行方法返回值
 * @param timeout 延迟 - 秒 (默认为 0)
 * @returns
 */
export const abiWait = async (fn: any, timeout: number = 0) => {
  const res = await fn?.wait?.()
  if (res?.status !== 1) {
    throw new Error(res)
  }
  await sleep(timeout * 1000) // 延迟
  return res
}

/**
 * 设置全局参数，挂载到 window.deboxConfig
 * @param opts defaultConf
 * @returns
 */
export const setConf = (opts: any) => {
  ;(window as any).deboxConfig = { ...defaultConf, ...(window as any)?.deboxConfig, ...opts }
}

export const equalAddress = (a?: any, b?: any) => {
  if (!a || !b) {
    return false
  }
  return `${a}`.toLocaleLowerCase() === `${b}`.toLocaleLowerCase()
}
