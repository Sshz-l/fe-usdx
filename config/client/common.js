module.exports = {
  title: 'USDX',
  description:
    'USDX stablecoin protocol: mint USDX, swap 1:1 via the stabilizer, redeem and claim daily releases.',
  keywords: 'USDX, stablecoin, BSC, mint, redeem, stabilizer',

  cookiePrefix: 'debox-',
  localStoragePrefix: 'debox-',
  cdn: '',
  basePath: '',
  api: {
    base: '/api',
    solRpc: 'https://rpc.debox.pro/-200',
  },
  gtag: '',
  facebookAppId: undefined,
  nftSaleTime: {
    t1: '2023-01-11T20:00:00+00:00',
  },
  defaultChainId: 1,
  canTestnet: true,
  walletConnect: '433db1b8f23d6c2f982fed207fa72963',
  storeVersion: 3,
  googleMap: 'AIzaSyCWBsOrKGDc5SdHwRq1niwSmY_OLingkEI',
  iframeUrl: ['https://s.debox.pro'],
  webappUrl: 'https://t.app.debox.pro',
  siteUrl: '',
  dgs: '',
  contractObj: {
    DGP: '0xF36b6D0a2281015cb8bC72FB88668448435f16b0',
    DGE: '0x2',
    DGC: '0x3',
    DGR: '0x97bf9465b19706e42b2c504f8b1f6ac54bb46499',
    DGS: '0x5',
  },
  posthogKey: 'phc_zsl8Uyxe6EeKPnvtX1kJqiwEMgJfiYm9VZ0XZObLu6Q',
  posthogHost: 'https://sa.debox.pro',
}
