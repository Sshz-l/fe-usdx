const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const { USDX_CHAIN_ID, USDX_TEST_ADDR, USDX_PROD_ADDR, resolveUsdxConfig } = require('./usdxConfig')

const projectRoot = path.resolve(__dirname, '../..')
const clientConfigDir = path.join(projectRoot, 'config/client')
const commonConfig = require(path.join(clientConfigDir, 'common.js'))
const runtimeConfig = (environment) => ({
  ...commonConfig,
  ...require(path.join(clientConfigDir, `${environment}.js`)),
})
const frozenTestRuntimeUsdx = {
  chainId: 56,
  diamond: '0x6e9a9b1d989B6A13887861707855B02a2E0A9ad0',
  usdx: '0x7c060Aff8631dd82dd44F6110D6E6BB29b88d5c5',
  usdt: '0x9da6E910AFc0624b9660991e7B7b54f467b12938',
  box: '0xA23741b00Cc6817B72232D7D33CAc7b21658a67d',
  boxOracle: '0x299f272dF0966fd238D0Ed8d29C173f75819345e',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
}
const frozenProdRuntimeUsdx = {
  chainId: 56,
  diamond: '0xF8BF3Ef115b0BBDEdA2c8C217a7414D934deD1D0',
  usdx: '0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D',
  usdt: '0x55d398326f99059fF775485246999027B3197955',
  box: '0x6386Adc4BC9c21984E34fD916BB349dD861742af',
  boxOracle: '0x812A7A9e243c6216C9597c4684384897af96D014',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
}

test('test diamond is BSC 56 and matches wiki freeze', () => {
  assert.equal(USDX_CHAIN_ID, 56)
  assert.equal(USDX_TEST_ADDR.diamond, '0x6e9a9b1d989B6A13887861707855B02a2E0A9ad0')
  assert.equal(USDX_TEST_ADDR.usdx, '0x7c060Aff8631dd82dd44F6110D6E6BB29b88d5c5')
  assert.equal(USDX_TEST_ADDR.usdt, '0x9da6E910AFc0624b9660991e7B7b54f467b12938')
  assert.equal(USDX_TEST_ADDR.box, '0xA23741b00Cc6817B72232D7D33CAc7b21658a67d')
  assert.equal(USDX_TEST_ADDR.boxOracle, '0x299f272dF0966fd238D0Ed8d29C173f75819345e')
  assert.equal(USDX_TEST_ADDR.permit2, '0x000000000022D473030F116dDEE9F6B43aC78BA3')
  assert.equal(USDX_TEST_ADDR.treasuryVault, '0x291c801e990d295F68F16a16b4B3E517cA0cf819')
  assert.equal(USDX_TEST_ADDR.stabilizerVault, '0x58Bc0dd1Fd819d1eF1Dbabb7a2D287c4dB68086C')
  assert.equal(USDX_TEST_ADDR.feeLocker, '0x946ceC03cC2FC362177b492BD412f56EFEc13430')
})

test('prod defaults match official BSC mainnet deployment', () => {
  assert.deepEqual(USDX_PROD_ADDR, frozenProdRuntimeUsdx)
})

test('merged production runtime config uses official USDX addresses', () => {
  const prod = runtimeConfig('prod')

  assert.equal(prod.canTestnet, false)
  assert.deepEqual(prod.usdx, frozenProdRuntimeUsdx)
  assert.deepEqual(resolveUsdxConfig(prod), USDX_PROD_ADDR)
})

test('merged dev and local runtime configs match the frozen TEST deployment', () => {
  const dev = runtimeConfig('dev')
  const local = runtimeConfig('local')

  assert.deepEqual(dev.usdx, frozenTestRuntimeUsdx)
  assert.deepEqual(local.usdx, frozenTestRuntimeUsdx)
  assert.deepEqual(resolveUsdxConfig(dev), USDX_TEST_ADDR)
  assert.deepEqual(resolveUsdxConfig(local), USDX_TEST_ADDR)
})

test('resolveUsdxConfig does not leak TEST vaults into prod', () => {
  const prod = resolveUsdxConfig(runtimeConfig('prod'))
  assert.equal(prod.treasuryVault, undefined)
  assert.equal(prod.stabilizerVault, undefined)
  assert.equal(prod.feeLocker, undefined)
  assert.equal(prod.diamond, USDX_PROD_ADDR.diamond)
})