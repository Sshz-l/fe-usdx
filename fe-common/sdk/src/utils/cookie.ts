import Cookies from 'js-cookie'

export function setCookie(
  name: string,
  value: any,
  day = 0,
  options: Cookies.CookieAttributes = {}
): void {
  if (typeof window === 'undefined') {
    return
  }
  const prefix = window?.deboxConfig?.cookiePrefix ?? ''
  Cookies.set(prefix + name, value, {
    expires: day,
    ...options,
  })
}

export function getCookie(name: string): string | undefined {
  if (typeof window === 'undefined') {
    return
  }
  const prefix = window?.deboxConfig?.cookiePrefix ?? ''
  return Cookies.get(prefix + name)
}

export function removeCookie(name: string, options?: Cookies.CookieAttributes): void {
  if (typeof window === 'undefined') {
    return
  }
  const prefix = window?.deboxConfig?.cookiePrefix ?? ''
  Cookies.remove(prefix + name, options)
}
