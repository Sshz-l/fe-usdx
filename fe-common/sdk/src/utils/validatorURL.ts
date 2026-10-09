import isURL, { type IsURLOptions } from 'validator/lib/isURL'

export function getValidatorURL(
  url?: string,
  opts?: IsURLOptions,
  whiteListedDomains?: string[]
): string {
  try {
    if (url?.startsWith('/') && !url.startsWith('//')) {
      return url
    }
    if (
      url &&
      isURL(url, {
        ...opts,
      })
    ) {
      if (Array.isArray(whiteListedDomains) && whiteListedDomains.length > 0) {
        const parsedUrl = new URL(url)
        if (
          [...whiteListedDomains, window.location.hostname, 'localhost', '127.0.0.1'].includes(
            parsedUrl.hostname
          )
        ) {
          return url
        }
      } else {
        return url
      }
    }
  } catch (e) {}
  return ''
}
