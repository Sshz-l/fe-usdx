const SCREEN_VIEWS = {
  's-mint': 'mint',
  's-swap': 'swap',
  's-redeem': 'redeem',
  's-mine': 'mine',
  's-claim': 'claim',
  's-plan': 'plan',
  's-activity': 'activity',
  's-swap-detail': 'swap-detail',
}

const getUsdxScreenView = (screen) => SCREEN_VIEWS[screen] || 'mint'

module.exports = {
  SCREEN_VIEWS,
  getUsdxScreenView,
}
