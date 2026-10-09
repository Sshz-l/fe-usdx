const USDX_PRIMARY_SCREENS = ['s-mint', 's-swap', 's-redeem', 's-mine']

const USDX_SCREENS = [
  's-mint',
  's-swap',
  's-redeem',
  's-mine',
  's-claim',
  's-plan',
  's-activity',
  's-swap-detail',
]

/** 旧 hash 兼容：首页 / 协议数据屏已删除，落到铸造 */
const HASH_TO_SCREEN = {
  mint: 's-mint',
  swap: 's-swap',
  redeem: 's-redeem',
  mine: 's-mine',
  claim: 's-claim',
  plan: 's-plan',
  activity: 's-activity',
  'swap-detail': 's-swap-detail',
  home: 's-mint',
  protocol: 's-mint',
}

const SCREEN_TO_HASH = Object.fromEntries(
  Object.entries(HASH_TO_SCREEN)
    .filter(([, screen]) => USDX_SCREENS.includes(screen))
    .filter(([hash]) => hash !== 'home' && hash !== 'protocol')
    .map(([hash, screen]) => [screen, hash])
)

const isUsdxPrimaryScreen = (screen) => USDX_PRIMARY_SCREENS.includes(screen)

const parseUsdxHash = (hash) => parseUsdxRoute(hash).screen

const parsePlanMintId = (segment) => {
  if (!segment) return null
  try {
    const id = BigInt(segment)
    return id > 0n ? id : null
  } catch {
    return null
  }
}

const parseRouteBigInt = (segment) => {
  if (segment == null || segment === '') return null
  try {
    return BigInt(segment)
  } catch {
    return null
  }
}

const SWAP_DETAIL_KINDS = new Set([3, 4, 5, 6])

const SWAP_DETAIL_BACK_HASH = {
  activity: 's-activity',
  mine: 's-mine',
  swap: 's-swap',
}

const SWAP_DETAIL_BACK_SCREEN = Object.fromEntries(
  Object.entries(SWAP_DETAIL_BACK_HASH).map(([hash, screen]) => [screen, hash])
)

/** @param {string[]} segments segments after swap-detail */
const parseSwapDetailRouteKey = (segments) => {
  if (segments.length < 5) return null
  const kind = Number(segments[0])
  if (!SWAP_DETAIL_KINDS.has(kind)) return null
  const mintId = parseRouteBigInt(segments[1])
  const ts = parseRouteBigInt(segments[2])
  const a0 = parseRouteBigInt(segments[3])
  const a1 = parseRouteBigInt(segments[4])
  if (mintId == null || ts == null || a0 == null || a1 == null) return null
  if (ts <= 0n) return null
  return { kind, mintId, ts, a0, a1 }
}

const parseSwapDetailBackScreen = (segment) => SWAP_DETAIL_BACK_HASH[segment] || null

const toSwapDetailBackHash = (screen) => SWAP_DETAIL_BACK_SCREEN[screen] || 'mine'

/** @returns {{ screen: string, planMintId: bigint | null, swapDetailKey: object | null, swapDetailBack: string | null }} */
const parseUsdxRoute = (hash) => {
  const raw = String(hash || '')
    .replace(/^#\/?/, '')
    .trim()
    .toLowerCase()
  const segments = raw.split('/').filter(Boolean)
  const head = segments[0]
  const screen = HASH_TO_SCREEN[head]
  const resolved = USDX_SCREENS.includes(screen) ? screen : 's-mint'
  const planMintId = resolved === 's-plan' ? parsePlanMintId(segments[1]) : null
  const swapDetailKey =
    resolved === 's-swap-detail' ? parseSwapDetailRouteKey(segments.slice(1)) : null
  const swapDetailBack =
    resolved === 's-swap-detail' ? parseSwapDetailBackScreen(segments[6]) : null
  return { screen: resolved, planMintId, swapDetailKey, swapDetailBack }
}

const toUsdxHash = (screen, params = {}) => {
  const base = SCREEN_TO_HASH[screen] || 'mint'
  if (screen === 's-plan' && params.planMintId != null) {
    return `#/${base}/${BigInt(params.planMintId).toString()}`
  }
  if (screen === 's-swap-detail' && params.swapDetailKey) {
    const { kind, mintId, ts, a0, a1 } = params.swapDetailKey
    const back = toSwapDetailBackHash(params.swapDetailBack || 's-mine')
    return `#/swap-detail/${kind}/${mintId}/${ts}/${a0}/${a1}/${back}`
  }
  return `#/${base}`
}

const USDX_BACK_SCREEN = {
  's-plan': 's-claim',
  's-claim': 's-mine',
  's-activity': 's-mine',
  's-swap-detail': 's-mine',
}

const getUsdxBackScreen = (screen) => USDX_BACK_SCREEN[screen] || 's-mine'

const getActivityNavigation = (kind, from = 's-activity') => {
  /* 与权威 HTML 一致：仅铸造（含 mid）与兑换可点；领取/赎回纯展示 */
  if (kind === 0) {
    return { type: 'screen', screen: 's-plan', back: from === 's-mine' ? 's-mine' : 's-claim' }
  }
  if (kind === 3 || kind === 4 || kind === 5 || kind === 6) {
    if (from === 's-mine') return { type: 'sheet', sheet: 'swap-detail', back: 's-mine' }
    return { type: 'screen', screen: 's-swap-detail', back: 's-mine' }
  }
  return { type: 'none' }
}

/** 兑换 / 赎回 / 我的展示链上 USDX 钱包余额；Tab 常驻挂载，切页时必须主动重拉 */
const shouldRefreshUsdxWalletOnScreen = (screen) =>
  screen === 's-swap' || screen === 's-redeem' || screen === 's-mine'

module.exports = {
  USDX_PRIMARY_SCREENS,
  USDX_SCREENS,
  isUsdxPrimaryScreen,
  parseUsdxHash,
  parseUsdxRoute,
  parseSwapDetailRouteKey,
  toUsdxHash,
  getUsdxBackScreen,
  getActivityNavigation,
  shouldRefreshUsdxWalletOnScreen,
}
