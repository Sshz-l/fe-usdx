module.exports = {
  canTestnet: false,
  api: {
    base: 'https://debox.pro',
    solRpc: 'https://rpc.debox.pro/-200',
  },
  gtag: 'G-63Z0MZK0BB',
  walletConnect: '433db1b8f23d6c2f982fed207fa72963',
  iframeUrl: ['https://m.debox.pro'],
  webappUrl: 'https://app.debox.pro',
  siteUrl: 'https://usdx-stable.com',
  dgs: '0xb0b25031D79dFEd70A2f77E85300f6E0b67CF54F',
  nft: '0x169d832de6f1f66d40e85eb6654bbac42375c069',
  rpcUrl: 'https://rpc.debox.pro/',
  contractObj: {
    DGP: '0x58cff419613c00a4828f774df8c2ca134dea97ce',
    DGE: '0x7bad7d55f82d237dbc24d7cd627ed13889e3f9f3',
    DGC: '0x191be5ee5a857c1cfdf76023f2b89a44cdaba008',
    DGR: '0x5de07ebf22b49289d6cf676a8df9b959fe68db0e',
    DGS: '0xb0b25031d79dfed70a2f77e85300f6e0b67cf54f',
  },
  stakeBoxToken: '0x6386adc4bc9c21984e34fd916bb349dd861742af',
  stakeContractAddress: '0x32303FFcb9B6564C2b8a373433A043a7f17E4B37',
  bscUsdtAddress: '0x55d398326f99059ff775485246999027b3197955',
  stakeChainId: 56,
  defaultNftStakingChainId: 1,
  aprConfig: {
    180: { seconds: 15552000, apr: 8, value: 0, zhlabel: '180天', enlabel: '180 days' }, // 180天
    365: { seconds: 31536000, apr: 18, value: 1, zhlabel: '365天', enlabel: '365 days' }, // 365天
    730: { seconds: 63072000, apr: 28, value: 2, zhlabel: '730天', enlabel: '730 days' }, // 730天
  },
  // PostHog Key - 生产环境
  posthogKey: 'phc_zsl8Uyxe6EeKPnvtX1kJqiwEMgJfiYm9VZ0XZObLu6Q',
  posthogHost: 'https://sa.debox.pro',
  stakeSeconds: 31536000, // 生产环境：365天
  stakeApr: 6, // APR: 6%
  /** 会员页「联系客服」DeBox 名片链接 */
  premiumCustomerServiceCardUrl:
    'https://m.debox.pro/card?id=sonwurxd&invite_code=sonwurxd',
  /** USDX BSC 正式部署 */
  usdx: {
    chainId: 56,
    diamond: '0xF8BF3Ef115b0BBDEdA2c8C217a7414D934deD1D0',
    usdx: '0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D',
    usdt: '0x55d398326f99059fF775485246999027B3197955',
    box: '0x6386Adc4BC9c21984E34fD916BB349dD861742af',
    boxOracle: '0x812A7A9e243c6216C9597c4684384897af96D014',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
}
