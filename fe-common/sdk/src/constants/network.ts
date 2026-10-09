import getConfig from 'next/config'
import {
  mainnet,
  sepolia,
  bsc,
  arbitrum,
  optimism,
  polygon,
  zkSync,
  avalanche,
  fantom,
  merlin,
  base,
  // blast,
  // linea,
  // scroll,
  btr,
  mantle,
  xLayer,
  type Chain,
} from 'wagmi/chains'

import btcImg from '../assets/svg/token/btc.svg'

const { publicRuntimeConfig } = getConfig()

export const NET_WORK = (function () {
  let obj: Record<number | string, Chain> = {
    [mainnet.id]: mainnet,
    [sepolia.id]: sepolia,
    [base.id]: base,
    [bsc.id]: bsc,
    [polygon.id]: polygon,
    [arbitrum.id]: arbitrum,
    [optimism.id]: optimism,
    [zkSync.id]: zkSync,
    [avalanche.id]: avalanche,
    [fantom.id]: fantom,
    // [blast.id]: blast,
    // [linea.id]: linea,
    [merlin.id]: merlin,
    // [scroll.id]: scroll,
    [btr.id]: btr,
    [mantle.id]: mantle,
    [xLayer.id]: xLayer,
    [210000]: {
      id: 210000,
      name: 'JuChain',
      nativeCurrency: {
        name: 'JU',
        symbol: 'JU',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://rpc.juchain.org'],
        },
        public: {
          http: ['https://rpc.juchain.org'],
        },
      },
      testnet: false,
      blockExplorers: {
        default: {
          name: 'ju',
          url: 'https://explorer.juscan.io',
        },
      },
    } as Chain,
    [173]: {
      id: 173,
      name: 'Eni',
      nativeCurrency: {
        name: 'EGAS',
        symbol: 'EGAS',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://rpc.eniac.network'],
        },
        public: {
          http: ['https://rpc.eniac.network'],
        },
      },
      testnet: false,
      blockExplorers: {
        default: {
          name: 'ENI Explorer',
          url: 'https://scan.eniac.network',
        },
      },
    } as Chain,
    [7257]: {
      id: 7257,
      name: 'PopChain',
      nativeCurrency: {
        name: 'POP',
        symbol: 'POP',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://r.popchain.ai'],
        },
        public: {
          http: ['https://r.popchain.ai'],
        },
      },
      testnet: false,
      blockExplorers: {
        default: {
          name: 'PopChain Explorer',
          url: 'https://scan.popchain.ai',
        },
      },
    } as Chain,
  }
  // 增加oklink的映射
  let oklinks: Record<number | string, string> = {
    [mainnet.id]: "ethereum",
    [sepolia.id]: "sepolia",
    [base.id]: "base",
    [bsc.id]: "bsc",
    [polygon.id]: "polygon",
    [arbitrum.id]: "arbitrum-one",
    [optimism.id]: "optimism",
    [zkSync.id]: "zksync-era",
    [avalanche.id]: "avalanche",
    [fantom.id]: "fantom",
    // [blast.id]: blast,
    // [linea.id]: linea,
    // [merlin.id]: "merlin",
    // [scroll.id]: scroll,
    [btr.id]: "bitlayer",
    // [mantle.id]: "man",
    [xLayer.id]: "x-layer",
    // [173]: "eni",
  }

  Object.keys(obj).map((item) => {
    const o = obj?.[item]
    if (!publicRuntimeConfig.canTestnet && o?.testnet) {
      delete obj?.[item]
    }
    // 如果存在oklink的映射，就替换
    if(oklinks?.[item]){
      o.blockExplorers = {
        default: {
          ...o.blockExplorers?.default,
          url: "https://www.oklink.com/"+oklinks?.[item],
        } as any,
      }
      obj[item] = o
    }
  })
  return obj
})()

export const CHAINS = Object.keys(NET_WORK).map((item) => NET_WORK[item]) as [Chain, ...Chain[]]

export const NET_WORK_ALL: Record<number | string, Chain> = {
  ...NET_WORK,
  [-200 as number]: {
    id: -200,
    name: 'Solana',
    testnet: false,
    blockExplorers: {
      default: {
        name: 'solanascan',
        url: 'https://www.oklink.com/solana',
      },
    },
  } as Chain,
  [-201 as number]: {
    id: -201,
    name: 'Tron',
    testnet: false,
    blockExplorers: {
      default: {
        name: 'tronscan',
        url: 'https://www.oklink.com/tron',
      },
    },
  } as Chain,
  // [210000 as number]: {
  //   id: 210000,
  //   name: 'JuChain',
  //   nativeCurrency: {
  //     name: 'JU',
  //     symbol: 'JU',
  //     decimals: 18,
  //   },
  //   rpcUrls: {
  //     default: {
  //       http: ['https://rpc.juchain.org'],
  //     },
  //     public: {
  //       http: ['https://rpc.juchain.org'],
  //     },
  //   },
  //   testnet: false,
  //   blockExplorers: {
  //     default: {
  //       name: 'ju',
  //       url: 'https://explorer.juscan.io',
  //     },
  //   },
  // } as Chain,
}

export const BTC_TYPE = {
  [-100]: {
    id: -100,
    name: 'Taproot',
  },
  [-101]: {
    id: -101,
    name: 'Nested Segwit',
  },
  [-102]: {
    id: -102,
    name: 'Native Segwit',
  },
}

export const SOLANA_TYPE = {
  [-200]: {
    id: -200,
    name: 'Solana',
  },
}

export const TRON_TYPE = {
  [-201]: {
    id: -201,
    name: 'Tron',
  },
}

export const LOGO_CHAINS: {
  [id: number | string]: string
} = {
  [mainnet.id]: 'https://data.debox.pro/token/icon/swap_select_eth.png',
  [sepolia.id]: 'https://data.debox.pro/token/icon/swap_select_eth.png',
  [base.id]: 'https://data.debox.pro/token/icon/swap_select_base.png',
  [bsc.id]: 'https://data.debox.pro/token/icon/swap_select_bnb.png',
  [polygon.id]: 'https://data.debox.pro/token/icon/swap_select_pol.png',
  [optimism.id]: 'https://data.debox.pro/token/icon/swap_select_op.png',
  [arbitrum.id]: 'https://data.debox.pro/token/icon/swap_select_arb.png',
  [zkSync.id]: 'https://data.debox.pro/token/icon/swap_select_zk.png',
  [avalanche.id]: 'https://data.debox.pro/token/icon/swap_select_ava.png',
  [fantom.id]: 'https://data.debox.pro/token/icon/swap_select_fantom.png',
  // [blast.id]: 'https://data.debox.pro/token/icon/swap_select_blast.png',
  // [linea.id]: 'https://data.debox.pro/token/icon/swap_select_linea.png',
  [merlin.id]: 'https://data.debox.pro/token/icon/swap_select_mer.png',
  // [scroll.id]: 'https://data.debox.pro/token/icon/swap_select_scr.png',
  [btr.id]: 'https://data.debox.pro/token/icon/swap_select_bitl.png',
  [mantle.id]: 'https://data.debox.pro/token/icon/swap_select_man.png',
  [xLayer.id]: 'https://data.debox.pro/token/icon/swap_select_xla.png',
  [-100]: btcImg.src, // Taproot
  [-101]: btcImg.src, // Nested Segwit
  [-102]: btcImg.src, // Native Segwit
  [-200]: 'https://data.debox.pro/token/icon/swap_select_sol.png', // solana
  [0]: 'https://data.debox.pro/static/b0/52ad30e44555d2e6c1c1bb4a18a098.png', // debox
  [888888]: 'https://data.debox.pro/static/b0/52ad30e44555d2e6c1c1bb4a18a098.png', // debox
  [-201]: 'https://data.debox.pro/token/icon/swap_select_tron.png', // tron
  [210000]:'https://data.debox.pro/token/icon/swap_select_ju.png',
  [173]: 'https://data.debox.pro/token/icon/swap_select_eni.png', // ENI
  [7257]: 'https://data.debox.pro/token/icon/swap_select_popchain.png', // PopChain
}

export const PRIVATE_TRANSFER_LOGO_CHAINS = {
  [mainnet.id]: 'https://data.debox.pro/token/icon/chain_transfer_eth.png',
  [sepolia.id]: 'https://data.debox.pro/token/icon/chain_transfer_eth.png',
  [base.id]: 'https://data.debox.pro/token/icon/chain_transfer_bas.png',
  [bsc.id]: 'https://data.debox.pro/token/icon/chain_transfer_bnb.png',
  [polygon.id]: 'https://data.debox.pro/token/icon/chain_transfer_pol.png',
  [optimism.id]: 'https://data.debox.pro/token/icon/chain_transfer_op.png',
  [arbitrum.id]: 'https://data.debox.pro/token/icon/chain_transfer_arb.png',
  [zkSync.id]: 'https://data.debox.pro/token/icon/chain_transfer_zk.png',
  [avalanche.id]: 'https://data.debox.pro/token/icon/chain_transfer_ava.png',
  [fantom.id]: 'https://data.debox.pro/token/icon/chain_transfer_fan.png',
  // [blast.id]: 'https://data.debox.pro/token/icon/chain_transfer_bla.png',
  // [linea.id]: 'https://data.debox.pro/token/icon/chain_transfer_lin.png',
  [merlin.id]: 'https://data.debox.pro/token/icon/chain_transfer_mer.png',
  // [scroll.id]: 'https://data.debox.pro/token/icon/chain_transfer_scr.png',
  [btr.id]: 'https://data.debox.pro/token/icon/chain_transfer_bitl.png',
  [mantle.id]: 'https://data.debox.pro/token/icon/chain_transfer_man.png',
  [xLayer.id]: 'https://data.debox.pro/token/icon/chain_transfer_xla.png',
  [-100]: '', // Taproot
  [-101]: '', // Nested Segwit
  [-102]: '', // Native Segwit  
  [-200]: 'https://data.debox.pro/token/icon/chain_transfer_sol.png', // solana
  [-201]: 'https://data.debox.pro/token/icon/chain_transfer_tron.png', // tron
  [0]: 'https://data.debox.pro/static/b0/52ad30e44555d2e6c1c1bb4a18a098.png', // debox
  [888888]: 'https://data.debox.pro/static/b0/52ad30e44555d2e6c1c1bb4a18a098.png', // debox
  [210000]:'https://data.debox.pro/token/icon/chain_transfer_ju.png',
  [173]: 'https://data.debox.pro/token/icon/chain_transfer_eni.png', // ENI
  [7257]: 'https://data.debox.pro/token/icon/chain_transfer_popchain.png', // PopChain
}
