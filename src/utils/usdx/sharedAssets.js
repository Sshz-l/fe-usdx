/** Bump when public/usdx/shared/*.css changes without a package version bump. */
const USDX_SHARED_STYLE_CACHE = '20260918'

const getUsdxSharedStyleUrl = (cdnPrefix, fileName, appVersion) => {
  const prefix = cdnPrefix == null ? '' : String(cdnPrefix)
  const name = String(fileName || '').replace(/^\/+/, '')
  const href = `${prefix}/usdx/shared/${name}`
  const key = [appVersion, USDX_SHARED_STYLE_CACHE]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('-')
  if (!key) return href
  return `${href}?v=${encodeURIComponent(key)}`
}

module.exports = {
  USDX_SHARED_STYLE_CACHE,
  getUsdxSharedStyleUrl,
}
