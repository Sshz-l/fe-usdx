const { formatUnits } = require('viem')
const { formatUsdxMoney } = require('./homeViews')
const { usdxT } = require('./usdxI18n')

const toAmount = (value) => {
  if (value == null) return 0
  const n = Number(formatUnits(BigInt(value), 18))
  return Number.isFinite(n) ? n : 0
}

const toWei = (value) => (value == null ? 0n : BigInt(value))

const getClaimSummary = (aggregate) => {
  const claimableWei = toWei(aggregate?.claimable)
  const remainingLockWei = toWei(aggregate?.remainingLock)
  const dailyWei = toWei(aggregate?.daily)
  const claimable = toAmount(claimableWei)
  const remainingLock = toAmount(remainingLockWei)
  const daily = toAmount(dailyWei)
  const hasPlan = claimableWei > 0n || remainingLockWei > 0n || dailyWei > 0n
  return {
    hasPlan,
    claimable,
    remainingLock,
    daily,
    claimableWei,
    canClaim: claimableWei > 0n,
  }
}

/** 领取成功 toast（对齐 HTML doClaim showToast） */
const formatClaimSuccessMessage = (amount) => {
  const label = formatUsdxMoney(amount)
  return label === '—' ? usdxT('Claim successful') : usdxT('Claimed {amount} USDX', { amount: label })
}

module.exports = {
  getClaimSummary,
  formatClaimSuccessMessage,
}
