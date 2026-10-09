const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  shouldShowUsdxFaucet,
  USDX_FAUCET_CLAIM_USDT,
  USDX_FAUCET_CLAIM_BOX,
  USDX_FAUCET_CLAIM_USDT_LABEL,
  USDX_FAUCET_CLAIM_BOX_LABEL,
} = require('./faucetViews')

const clientConfigDir = path.resolve(__dirname, '../../../config/client')
const commonConfig = require(path.join(clientConfigDir, 'common.js'))
const runtimeConfig = (environment) => ({
  ...commonConfig,
  ...require(path.join(clientConfigDir, `${environment}.js`)),
})

test('faucet amounts match wiki recommended first claim', () => {
  assert.equal(USDX_FAUCET_CLAIM_USDT, 10_000n * 10n ** 18n)
  assert.equal(USDX_FAUCET_CLAIM_BOX, 400_000n * 10n ** 18n)
  assert.equal(USDX_FAUCET_CLAIM_USDT_LABEL, '10,000')
  assert.equal(USDX_FAUCET_CLAIM_BOX_LABEL, '400,000')
})

test('faucet entry is visible only when canTestnet is explicitly true', () => {
  assert.equal(shouldShowUsdxFaucet({ canTestnet: true }), true)
  assert.equal(shouldShowUsdxFaucet({ canTestnet: false }), false)
  assert.equal(shouldShowUsdxFaucet({}), false)
  assert.equal(shouldShowUsdxFaucet(), false)
})

test('merged local/dev runtimes show faucet; prod hides it', () => {
  assert.equal(shouldShowUsdxFaucet(runtimeConfig('local')), true)
  assert.equal(shouldShowUsdxFaucet(runtimeConfig('dev')), true)
  assert.equal(shouldShowUsdxFaucet(runtimeConfig('prod')), false)
})
