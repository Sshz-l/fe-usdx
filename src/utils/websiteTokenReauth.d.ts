export const WEBSITE_TOKEN_REAUTH_TOPIC: string
export const WEBSITE_TOKEN_REAUTH_TIMEOUT_MS: number

export function shouldDeferWebsiteTokenExpiredLogout(args?: {
  isDeBoxApp?: boolean
  code?: number
}): boolean

export function shouldClearSessionBeforeWebsiteRelogin(args?: {
  isDeBoxApp?: boolean
  checkTokenFailed?: boolean
  addressMismatch?: boolean
}): boolean

export function beginWebsiteTokenReauth(args?: {
  timeoutMs?: number
  publish?: (topic: string) => void
  onTimeout?: () => void
}): { started: boolean }

export function completeWebsiteTokenReauth(): void
export function isWebsiteTokenReauthInFlight(): boolean
export function resetWebsiteTokenReauthForTests(): void

export function resolvePremiumProfileDisplay(args?: {
  isLoggedIn?: boolean
  isDeBoxRestoring?: boolean
  basicInfo?: { avatar?: string; name?: string } | null
  account?: { name?: string; pic?: string; address?: string } | null
  defaultAvatar?: string
  notLoggedInLabel?: string
}): {
  showProfile: boolean
  avatar: string
  name: string
  restoring: boolean
}
