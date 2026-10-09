const USDX_CHAIN_ID = 56

/** BSC TEST 部署（2026-09-17；权威见 debox-tech-wiki USDX 前端集成 §2） */
const USDX_TEST_ADDR = {
  chainId: USDX_CHAIN_ID,
  diamond: '0x6e9a9b1d989B6A13887861707855B02a2E0A9ad0',
  usdx: '0x7c060Aff8631dd82dd44F6110D6E6BB29b88d5c5',
  usdt: '0x9da6E910AFc0624b9660991e7B7b54f467b12938',
  box: '0xA23741b00Cc6817B72232D7D33CAc7b21658a67d',
  boxOracle: '0x299f272dF0966fd238D0Ed8d29C173f75819345e',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  treasuryVault: '0x291c801e990d295F68F16a16b4B3E517cA0cf819',
  stabilizerVault: '0x58Bc0dd1Fd819d1eF1Dbabb7a2D287c4dB68086C',
  feeLocker: '0x946ceC03cC2FC362177b492BD412f56EFEc13430',
}

/** BSC 正式部署（主网 USDT / BOX） */
const USDX_PROD_ADDR = {
  chainId: USDX_CHAIN_ID,
  diamond: '0xF8BF3Ef115b0BBDEdA2c8C217a7414D934deD1D0',
  usdx: '0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D',
  usdt: '0x55d398326f99059fF775485246999027B3197955',
  box: '0x6386Adc4BC9c21984E34fD916BB349dD861742af',
  boxOracle: '0x812A7A9e243c6216C9597c4684384897af96D014',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
}

/**
 * 有 runtime.usdx.diamond 即启用。
 * canTestnet=true 时补齐 TEST vault 等缺省；否则用正式地址缺省（避免把 TEST vault 并进 prod）。
 */
const resolveUsdxConfig = (runtime = {}) => {
  const usdx = runtime.usdx
  if (!usdx?.diamond) return null
  const defaults = runtime.canTestnet === true ? USDX_TEST_ADDR : USDX_PROD_ADDR
  return {
    ...defaults,
    ...usdx,
    chainId: Number(usdx.chainId || USDX_CHAIN_ID),
  }
}

module.exports = {
  USDX_CHAIN_ID,
  USDX_TEST_ADDR,
  USDX_PROD_ADDR,
  resolveUsdxConfig,
}
