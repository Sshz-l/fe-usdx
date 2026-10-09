const WEBSITE_TOKEN_REAUTH_TOPIC = 'websiteTokenReauth'
const WEBSITE_TOKEN_REAUTH_TIMEOUT_MS = 15000

let reauthTimer = null
let reauthInFlight = false

const shouldDeferWebsiteTokenExpiredLogout = ({ isDeBoxApp, code } = {}) =>
  Boolean(isDeBoxApp) && code === -2007

const shouldClearSessionBeforeWebsiteRelogin = ({
  isDeBoxApp,
  checkTokenFailed,
  addressMismatch,
} = {}) => {
  if (addressMismatch) return true
  if (!checkTokenFailed) return false
  // App WebView: keep local profile while exchanging wallet_token → website_token
  if (isDeBoxApp) return false
  return true
}

const beginWebsiteTokenReauth = ({
  timeoutMs = WEBSITE_TOKEN_REAUTH_TIMEOUT_MS,
  publish,
  onTimeout,
} = {}) => {
  if (reauthInFlight) return { started: false }
  reauthInFlight = true
  if (typeof publish === 'function') publish(WEBSITE_TOKEN_REAUTH_TOPIC)
  if (reauthTimer) clearTimeout(reauthTimer)
  reauthTimer = setTimeout(() => {
    reauthTimer = null
    reauthInFlight = false
    if (typeof onTimeout === 'function') onTimeout()
  }, timeoutMs)
  return { started: true }
}

const completeWebsiteTokenReauth = () => {
  if (reauthTimer) clearTimeout(reauthTimer)
  reauthTimer = null
  reauthInFlight = false
}

const isWebsiteTokenReauthInFlight = () => reauthInFlight

const resetWebsiteTokenReauthForTests = () => {
  if (reauthTimer) clearTimeout(reauthTimer)
  reauthTimer = null
  reauthInFlight = false
}

const resolvePremiumProfileDisplay = ({
  isLoggedIn,
  isDeBoxRestoring,
  basicInfo,
  account,
  defaultAvatar,
  notLoggedInLabel,
} = {}) => {
  const hasLocalProfile = Boolean(account?.name || account?.pic || account?.address)
  const showProfile = Boolean(isLoggedIn || isDeBoxRestoring || hasLocalProfile)
  const restoring = Boolean(isDeBoxRestoring && !basicInfo?.name && !account?.name)
  return {
    showProfile,
    avatar: showProfile
      ? basicInfo?.avatar || account?.pic || defaultAvatar
      : defaultAvatar,
    name: showProfile
      ? basicInfo?.name || account?.name || (restoring ? '...' : '--')
      : notLoggedInLabel,
    restoring,
  }
}

module.exports = {
  WEBSITE_TOKEN_REAUTH_TOPIC,
  WEBSITE_TOKEN_REAUTH_TIMEOUT_MS,
  beginWebsiteTokenReauth,
  completeWebsiteTokenReauth,
  isWebsiteTokenReauthInFlight,
  resetWebsiteTokenReauthForTests,
  resolvePremiumProfileDisplay,
  shouldClearSessionBeforeWebsiteRelogin,
  shouldDeferWebsiteTokenExpiredLogout,
}
