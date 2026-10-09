module.exports = {
  defaultChainId: 10, // 137  11155111,
  api: {
    base: 'https://t.debox.pro',
    solRpc: 'https://rpc.debox.pro/-200',
  },
  // Requires next.config rewrite; set AI_ASSISTANT_PROXY_URL=https://... when using `next dev/start`.
  aiAssistantApiBase: '/api/ai-assistant-proxy',
  // canTestnet: false,
  iframeUrl: ['https://s.debox.pro'], // ['https://s.debox.pro'], // 'http://localhost:3008',
  webappUrl: 'https://t.app.debox.pro',
  dgs: '0x0f14b3171fD6D6ecAdDc0C5073434aC951C44355',
  nft: '0x8F381566f91c7c70c62Bae01B007a2a040a14363',
  fsbt: '0xe2f6a897f229c453cfb2b7de691ad1969bccc96e',
  rpcUrl: 'https://trpc.debox.pro/',
  stakeBoxToken:'0xF7b3DdC46827D668ac0d82f33bE65ac201c18d92',
  stakeContractAddress:'0x561Abf091Fef06B1b4395794DFc168d096155be7',
  bscUsdtAddress:"0xBAc62974bcb7a57F38fBaF65Bc1a93Bc5ad05f16",
  stakeChainId:10,
  aprConfig:{
    180:{ seconds:600,apr:4,value:2,zhlabel:'10分钟',enlabel:'10 min'},//10分
    365:{ seconds:3600,apr:6,value:3,zhlabel:'1小时',enlabel:'1 hour'},//1小时
    730:{ seconds:86400,apr:8,value:4,zhlabel:'1天',enlabel:'1 day'},//1天
  },
  // PostHog Key - 本地开发环境
  posthogKey: 'phc_zsl8Uyxe6EeKPnvtX1kJqiwEMgJfiYm9VZ0XZObLu6Q',
  posthogHost: 'https://sa.debox.pro',
  stakeSeconds: 600, // 测试环境：10分钟
  stakeApr: 6, // APR: 6%
  /** 会员页「联系客服」DeBox 名片链接 */
  premiumCustomerServiceCardUrl:
    'https://s.debox.pro/card?id=w88k72ad&invite_code=w88k72ad',
  /** USDX BSC TEST（与 config/client/dev.js 对齐；prod 禁止写入） */
  usdx: {
    chainId: 56,
    diamond: '0x6e9a9b1d989B6A13887861707855B02a2E0A9ad0',
    usdx: '0x7c060Aff8631dd82dd44F6110D6E6BB29b88d5c5',
    usdt: '0x9da6E910AFc0624b9660991e7B7b54f467b12938',
    box: '0xA23741b00Cc6817B72232D7D33CAc7b21658a67d',
    boxOracle: '0x299f272dF0966fd238D0Ed8d29C173f75819345e',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
}
