/** 建议首次领取数量（见 wiki 20260902-BSC-TEST-测试币领取-tech.md §3） */
const USDX_FAUCET_CLAIM_USDT = 10_000n * 10n ** 18n
const USDX_FAUCET_CLAIM_BOX = 400_000n * 10n ** 18n

const USDX_FAUCET_CLAIM_USDT_LABEL = '10,000'
const USDX_FAUCET_CLAIM_BOX_LABEL = '400,000'

/** 仅 local / 测试构建（canTestnet: true）；prod 必须隐藏 */
const shouldShowUsdxFaucet = (runtime = {}) => runtime.canTestnet === true

module.exports = {
  USDX_FAUCET_CLAIM_USDT,
  USDX_FAUCET_CLAIM_BOX,
  USDX_FAUCET_CLAIM_USDT_LABEL,
  USDX_FAUCET_CLAIM_BOX_LABEL,
  shouldShowUsdxFaucet,
}
