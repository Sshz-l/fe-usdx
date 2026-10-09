import { useEffect } from 'react'

import { setCookie, getCookie } from '../utils/cookie'

export const useRefererUrl = () => {
  useEffect(() => {
    // 从当前url中取出referer参数，存入cookie中
    const url = new URL(window.location.href)
    const referer = url.searchParams.get('referer')
    if (referer) {
      setCookie('debox_referer', referer, 7)
    }
  }, [])
}

export const getReferer = () => {
  return getCookie('debox_referer')
}
