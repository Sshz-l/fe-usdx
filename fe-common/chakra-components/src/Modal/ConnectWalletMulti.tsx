'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Stack,
  Button,
  Image,
  Box,
  Text,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react'
import { useConnect, type Connector } from 'wagmi'
import {
  useWallet as useSolanaWallet,
  type Wallet as SolanaWallet,
} from '@solana/wallet-adapter-react'
import {
  useWallet as useTronWallet,
  type Wallet as TronWallet,
} from '@tronweb3/tronwallet-adapter-react-hooks'
import { isInBinance } from '@binance/w3w-utils'

import { useConnect as useConnectBtc } from '@fe-common/sdk/src/hooks/btc/useConnect'
import { px2vw } from '@fe-common/sdk/src/utils'
import Loading from '@fe-common/chakra-components/src/Loading'
import WalletConnectImg from '@fe-common/chakra-components/assets/svg/wallet/wc2.png'
import BrowserWallet from '@fe-common/chakra-components/assets/svg/wallet/BrowserWallet.svg'
import OKX from '@fe-common/chakra-components/assets/svg/wallet/okx2.png'
import bkImg from '@fe-common/chakra-components/assets/svg/wallet/bk.png'
import tpImg from '@fe-common/chakra-components/assets/svg/wallet/tp.png'
import unisatImg from '@fe-common/chakra-components/assets/svg/wallet/unisat.png'
import logoImg from '@fe-common/chakra-components/assets/svg/logo.svg'
import DeswpLogoImg from '@fe-common/chakra-components/assets/svg/wallet/DeswpLogo.png'
import phantomImg from '@fe-common/chakra-components/assets/svg/wallet/phantom.svg'
import solflareImg from '@fe-common/chakra-components/assets/svg/wallet/solflare.svg'
import trustImg from '@fe-common/chakra-components/assets/svg/wallet/trust.png'

type TWalletType = 'evm' | 'btc' | 'solana' | 'tron'

interface TabItem {
  type: string
  title: string
  component: React.ReactElement
  disable: boolean
}

interface TProps {
  onClose: () => void
  locale?: 'zh' | 'en'
  data?: {
    walletType: TWalletType
    isDeSwap: boolean
    hasNoBtc?: boolean
    brandLogo?: string
    welcomeTitle?: string
  }
  customComponents?: TabItem[]
}
// 添加新的错误处理常量
const WALLET_ERRORS = {
  WALLET_NOT_FOUND: 'Wallet not found',
  CONNECTION_ERROR: 'Connection error',
  USER_REJECTED: 'User rejected the request',
  WALLET_NOT_INSTALLED: 'Wallet not installed',
} as const

// 添加设备检测工具函数（SSR 安全）
const getUserAgent = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '')
const isIOS = () => /iPhone|iPad|iPod/i.test(getUserAgent())
const isAndroid = () => /Android/i.test(getUserAgent())

// 安全获取当前页面 URL（SSR 兼容）
const getCurrentHref = () => (typeof window !== 'undefined' ? window.location.href : '')

// 添加生成 deeplink 的工具函数
const generateDeeplink = (config: {
  ios?: string
  android?: string
  fallback?: string
  appStore?: string
  playStore?: string
}) => {
  if (isIOS()) {
    return {
      deeplink: config.ios,
      store: config.appStore,
    }
  }
  if (isAndroid()) {
    return {
      deeplink: config.android,
      store: config.playStore,
    }
  }
  return {
    deeplink: config.fallback,
    store: config.appStore,
  }
}

// 钱包配置
const WALLET_CONFIGS = {
  metamask: {
    ios: 'metamask://dapp/' + encodeURIComponent(getCurrentHref()),
    android:
      'intent://dapp/' +
      encodeURIComponent(getCurrentHref()) +
      '#Intent;scheme=metamask;package=io.metamask;end;',
    appStore: 'https://apps.apple.com/app/metamask/id1438144202',
    playStore: 'https://play.google.com/store/apps/details?id=io.metamask',
  },
  trust: {
    ios: 'trust://dapp?url=' + encodeURIComponent(getCurrentHref()),
    android:
      'intent://dapp/' +
      encodeURIComponent(getCurrentHref()) +
      '#Intent;scheme=trust;package=com.wallet.trust;end;',
    appStore: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStore: 'https://play.google.com/store/apps/details?id=com.wallet.trust',
  },
  okx: {
    ios: 'okx://wallet/dapp/url?dappUrl=' + encodeURIComponent(getCurrentHref()),
    android: 'okx://wallet/dapp/url?dappUrl=' + encodeURIComponent(getCurrentHref()),
    appStore: 'https://apps.apple.com/app/okx-buy-bitcoin-crypto/id1327268470',
    playStore: 'https://play.google.com/store/apps/details?id=com.okex.wallet',
  },
  tokenpocket: {
    ios:
      'tpdapp://open?params=' +
      encodeURIComponent(JSON.stringify({ url: getCurrentHref(), chain: 'EVM', source: 'debox' })),
    android:
      'tpdapp://open?params=' +
      encodeURIComponent(JSON.stringify({ url: getCurrentHref(), chain: 'EVM', source: 'debox' })),
    appStore: 'https://apps.apple.com/app/tokenpocket/id1436028697',
    playStore: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
  },
  bitget: {
    ios: 'https://bkcode.vip?action=dapp&url=' + encodeURIComponent(getCurrentHref()),
    android: 'https://bkcode.vip?action=dapp&url=' + encodeURIComponent(getCurrentHref()),
    appStore: 'https://apps.apple.com/app/bitget-crypto-trading-wallet/id1598432977',
    playStore: 'https://play.google.com/store/apps/details?id=com.bitget.web3',
  },
  phantom: {
    ios: `https://phantom.app/ul/browse/${encodeURIComponent(getCurrentHref())}`,
    android: `https://phantom.app/ul/browse/${encodeURIComponent(getCurrentHref())}`,
    appStore: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
    playStore: 'https://play.google.com/store/apps/details?id=app.phantom',
  },
  solflare: {
    ios: `https://solflare.com/ul/v1/browse/${encodeURIComponent(getCurrentHref())}`,
    android: `https://solflare.com/ul/v1/browse/${encodeURIComponent(getCurrentHref())}`,
    appStore: 'https://apps.apple.com/app/solflare/id1580902717',
    playStore: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
  },
  binance: {
    ios: 'bnc://dapp?url=' + encodeURIComponent(getCurrentHref()),
    android: 'bnc://dapp?url=' + encodeURIComponent(getCurrentHref()),
    appStore: 'https://apps.apple.com/app/binance-buy-bitcoin-crypto/id1436799971',
    playStore: 'https://play.google.com/store/apps/details?id=com.binance.dev',
    fallback: 'https://www.binance.com/en/dex/dapps?url=' + encodeURIComponent(getCurrentHref()),
  },
} as const

enum ConnectorId {
  // EVM
  'BinanceW3WSDK' = 'BinanceW3WSDK',
  'injected' = 'injected',
  'pro.tokenpocket' = 'pro.tokenpocket',
  'com.bitget.web3' = 'com.bitget.web3',
  'com.okex.wallet' = 'com.okex.wallet',
  'walletConnect' = 'walletConnect',
  'io.metamask' = 'io.metamask',
  // BTC
  'okxWalletBtc' = 'okxWalletBtc',
  'unisatWallet' = 'unisatWallet',
  // SOLANA
  'Phantom' = 'Phantom',
  'Solflare' = 'Solflare',
  'Trust' = 'Trust',
  'OKX Wallet' = 'OKX Wallet',
  'Bitget Wallet' = '"Bitget Wallet"',
  // TRON
  'TokenPocket' = 'TokenPocket',
}
// 添加检测是否为移动端的函数（SSR 安全）
const isMobile = () => {
  const ua = getUserAgent()
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

const cfgs: Record<
  ConnectorId,
  {
    id: string
    name: string
    logoImg: string
    url: string
    type: TWalletType
    deeplink?: string
    appStore?: string
    isInApp?: boolean
  }
> = {

  [ConnectorId['injected']]: {
    id: ConnectorId['injected'],
    name: 'Browser wallet',
    logoImg: BrowserWallet.src,
    url: '',
    type: 'evm',
  },
  [ConnectorId['walletConnect']]: {
    id: ConnectorId['walletConnect'],
    name: 'WalletConnect',
    logoImg: WalletConnectImg.src,
    url: 'https://walletconnect.com/',
    type: 'evm',
  },
  [ConnectorId['BinanceW3WSDK']]: {
    id: ConnectorId['BinanceW3WSDK'],
    name: 'Binance Wallet',
    logoImg: 'https://data.debox.pro/token/icon/swap_select_bnb.png',
    url: 'https://www.binance.com/en/wallet',
    type: 'evm',
    isInApp: typeof navigator !== 'undefined' && /BinanceWeb3/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.binance),
  },
  [ConnectorId['io.metamask']]: {
    id: ConnectorId['io.metamask'],
    name: 'MetaMask',
    logoImg:
      'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjMzIiB2aWV3Qm94PSIwIDAgMzUgMzMiIHdpZHRoPSIzNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iLjI1Ij48cGF0aCBkPSJtMzIuOTU4MiAxLTEzLjEzNDEgOS43MTgzIDIuNDQyNC01LjcyNzMxeiIgZmlsbD0iI2UxNzcyNiIgc3Ryb2tlPSIjZTE3NzI2Ii8+PGcgZmlsbD0iI2UyNzYyNSIgc3Ryb2tlPSIjZTI3NjI1Ij48cGF0aCBkPSJtMi42NjI5NiAxIDEzLjAxNzE0IDkuODA5LTIuMzI1NC01LjgxODAyeiIvPjxwYXRoIGQ9Im0yOC4yMjk1IDIzLjUzMzUtMy40OTQ3IDUuMzM4NiA3LjQ4MjkgMi4wNjAzIDIuMTQzNi03LjI4MjN6Ii8+PHBhdGggZD0ibTEuMjcyODEgMjMuNjUwMSAyLjEzMDU1IDcuMjgyMyA3LjQ2OTk0LTIuMDYwMy0zLjQ4MTY2LTUuMzM4NnoiLz48cGF0aCBkPSJtMTAuNDcwNiAxNC41MTQ5LTIuMDc4NiAzLjEzNTggNy40MDUuMzM2OS0uMjQ2OS03Ljk2OXoiLz48cGF0aCBkPSJtMjUuMTUwNSAxNC41MTQ5LTUuMTU3NS00LjU4NzA0LS4xNjg4IDguMDU5NzQgNy40MDQ5LS4zMzY5eiIvPjxwYXRoIGQ9Im0xMC44NzMzIDI4Ljg3MjEgNC40ODE5LTIuMTYzOS0zLjg1ODMtMy4wMDYyeiIvPjxwYXRoIGQ9Im0yMC4yNjU5IDI2LjcwODIgNC40Njg5IDIuMTYzOS0uNjEwNS01LjE3MDF6Ii8+PC9nPjxwYXRoIGQ9Im0yNC43MzQ4IDI4Ljg3MjEtNC40NjktMi4xNjM5LjM2MzggMi45MDI1LS4wMzkgMS4yMzF6IiBmaWxsPSIjZDViZmIyIiBzdHJva2U9IiNkNWJmYjIiLz48cGF0aCBkPSJtMTAuODczMiAyOC44NzIxIDQuMTU3MiAxLjk2OTYtLjAyNi0xLjIzMS4zNTA4LTIuOTAyNXoiIGZpbGw9IiNkNWJmYjIiIHN0cm9rZT0iI2Q1YmZiMiIvPjxwYXRoIGQ9Im0xNS4xMDg0IDIxLjc4NDItMy43MTU1LTEuMDg4NCAyLjYyNDMtMS4yMDUxeiIgZmlsbD0iIzIzMzQ0NyIgc3Ryb2tlPSIjMjMzNDQ3Ii8+PHBhdGggZD0ibTIwLjUxMjYgMjEuNzg0MiAxLjA5MTMtMi4yOTM1IDIuNjM3MiAxLjIwNTF6IiBmaWxsPSIjMjMzNDQ3IiBzdHJva2U9IiMyMzM0NDciLz48cGF0aCBkPSJtMTAuODczMyAyOC44NzIxLjY0OTUtNS4zMzg2LTQuMTMxMTcuMTE2N3oiIGZpbGw9IiNjYzYyMjgiIHN0cm9rZT0iI2NjNjIyOCIvPjxwYXRoIGQ9Im0yNC4wOTgyIDIzLjUzMzUuNjM2NiA1LjMzODYgMy40OTQ2LTUuMjIxOXoiIGZpbGw9IiNjYzYyMjgiIHN0cm9rZT0iI2NjNjIyOCIvPjxwYXRoIGQ9Im0yNy4yMjkxIDE3LjY1MDctNy40MDUuMzM2OS42ODg1IDMuNzk2NiAxLjA5MTMtMi4yOTM1IDIuNjM3MiAxLjIwNTF6IiBmaWxsPSIjY2M2MjI4IiBzdHJva2U9IiNjYzYyMjgiLz48cGF0aCBkPSJtMTEuMzkyOSAyMC42OTU4IDIuNjI0Mi0xLjIwNTEgMS4wOTEzIDIuMjkzNS42ODg1LTMuNzk2Ni03LjQwNDk1LS4zMzY5eiIgZmlsbD0iI2NjNjIyOCIgc3Ryb2tlPSIjY2M2MjI4Ii8+PHBhdGggZD0ibTguMzkyIDE3LjY1MDcgMy4xMDQ5IDYuMDUxMy0uMTAzOS0zLjAwNjJ6IiBmaWxsPSIjZTI3NTI1IiBzdHJva2U9IiNlMjc1MjUiLz48cGF0aCBkPSJtMjQuMjQxMiAyMC42OTU4LS4xMTY5IDMuMDA2MiAzLjEwNDktNi4wNTEzeiIgZmlsbD0iI2UyNzUyNSIgc3Ryb2tlPSIjZTI3NTI1Ii8+PHBhdGggZD0ibTE1Ljc5NyAxNy45ODc2LS42ODg2IDMuNzk2Ny44NzA0IDQuNDgzMy4xOTQ5LTUuOTA4N3oiIGZpbGw9IiNlMjc1MjUiIHN0cm9rZT0iI2UyNzUyNSIvPjxwYXRoIGQ9Im0xOS44MjQyIDE3Ljk4NzYtLjM2MzggMi4zNTg0LjE4MTkgNS45MjE2Ljg3MDQtNC40ODMzeiIgZmlsbD0iI2UyNzUyNSIgc3Ryb2tlPSIjZTI3NTI1Ii8+PHBhdGggZD0ibTIwLjUxMjcgMjEuNzg0Mi0uODcwNCA0LjQ4MzQuNjIzNi40NDA2IDMuODU4NC0zLjAwNjIuMTE2OS0zLjAwNjJ6IiBmaWxsPSIjZjU4NDFmIiBzdHJva2U9IiNmNTg0MWYiLz48cGF0aCBkPSJtMTEuMzkyOSAyMC42OTU4LjEwNCAzLjAwNjIgMy44NTgzIDMuMDA2Mi42MjM2LS40NDA2LS44NzA0LTQuNDgzNHoiIGZpbGw9IiNmNTg0MWYiIHN0cm9rZT0iI2Y1ODQxZiIvPjxwYXRoIGQ9Im0yMC41OTA2IDMwLjg0MTcuMDM5LTEuMjMxLS4zMzc4LS4yODUxaC00Ljk2MjZsLS4zMjQ4LjI4NTEuMDI2IDEuMjMxLTQuMTU3Mi0xLjk2OTYgMS40NTUxIDEuMTkyMSAyLjk0ODkgMi4wMzQ0aDUuMDUzNmwyLjk2Mi0yLjAzNDQgMS40NDItMS4xOTIxeiIgZmlsbD0iI2MwYWM5ZCIgc3Ryb2tlPSIjYzBhYzlkIi8+PHBhdGggZD0ibTIwLjI2NTkgMjYuNzA4Mi0uNjIzNi0uNDQwNmgtMy42NjM1bC0uNjIzNi40NDA2LS4zNTA4IDIuOTAyNS4zMjQ4LS4yODUxaDQuOTYyNmwuMzM3OC4yODUxeiIgZmlsbD0iIzE2MTYxNiIgc3Ryb2tlPSIjMTYxNjE2Ii8+PHBhdGggZD0ibTMzLjUxNjggMTEuMzUzMiAxLjEwNDMtNS4zNjQ0Ny0xLjY2MjktNC45ODg3My0xMi42OTIzIDkuMzk0NCA0Ljg4NDYgNC4xMjA1IDYuODk4MyAyLjAwODUgMS41Mi0xLjc3NTItLjY2MjYtLjQ3OTUgMS4wNTIzLS45NTg4LS44MDU0LS42MjIgMS4wNTIzLS44MDM0eiIgZmlsbD0iIzc2M2UxYSIgc3Ryb2tlPSIjNzYzZTFhIi8+PHBhdGggZD0ibTEgNS45ODg3MyAxLjExNzI0IDUuMzY0NDctLjcxNDUxLjUzMTMgMS4wNjUyNy44MDM0LS44MDU0NS42MjIgMS4wNTIyOC45NTg4LS42NjI1NS40Nzk1IDEuNTE5OTcgMS43NzUyIDYuODk4MzUtMi4wMDg1IDQuODg0Ni00LjEyMDUtMTIuNjkyMzMtOS4zOTQ0eiIgZmlsbD0iIzc2M2UxYSIgc3Ryb2tlPSIjNzYzZTFhIi8+PHBhdGggZD0ibTMyLjA0ODkgMTYuNTIzNC02Ljg5ODMtMi4wMDg1IDIuMDc4NiAzLjEzNTgtMy4xMDQ5IDYuMDUxMyA0LjEwNTItLjA1MTloNi4xMzE4eiIgZmlsbD0iI2Y1ODQxZiIgc3Ryb2tlPSIjZjU4NDFmIi8+PHBhdGggZD0ibTEwLjQ3MDUgMTQuNTE0OS02Ljg5ODI4IDIuMDA4NS0yLjI5OTQ0IDcuMTI2N2g2LjExODgzbDQuMTA1MTkuMDUxOS0zLjEwNDg3LTYuMDUxM3oiIGZpbGw9IiNmNTg0MWYiIHN0cm9rZT0iI2Y1ODQxZiIvPjxwYXRoIGQ9Im0xOS44MjQxIDE3Ljk4NzYuNDQxNy03LjU5MzIgMi4wMDA3LTUuNDAzNGgtOC45MTE5bDIuMDAwNiA1LjQwMzQuNDQxNyA3LjU5MzIuMTY4OSAyLjM4NDIuMDEzIDUuODk1OGgzLjY2MzVsLjAxMy01Ljg5NTh6IiBmaWxsPSIjZjU4NDFmIiBzdHJva2U9IiNmNTg0MWYiLz48L2c+PC9zdmc+',
    url: 'https://metamask.io/',
    type: 'evm',
    isInApp: typeof navigator !== 'undefined' && /MetaMask/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.metamask),
  },

  [ConnectorId['com.okex.wallet']]: {
    id: ConnectorId['com.okex.wallet'],
    name: 'OKX Wallet',
    logoImg: OKX.src,
    url: 'https://www.okx.com/download',
    type: 'evm',
    isInApp: typeof navigator !== 'undefined' && /OKApp/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.okx),
  },
  [ConnectorId['pro.tokenpocket']]: {
    id: ConnectorId['pro.tokenpocket'],
    name: 'TokenPocket',
    logoImg: tpImg.src,
    url: 'https://www.tokenpocket.pro/',
    type: 'evm',
    isInApp: typeof navigator !== 'undefined' && /TokenPocket/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.tokenpocket),
  },
  [ConnectorId['com.bitget.web3']]: {
    id: ConnectorId['com.bitget.web3'],
    name: 'Bitget Wallet',
    logoImg: bkImg.src,
    url: 'https://bitkeep.com/',
    type: 'evm',
    isInApp: typeof navigator !== 'undefined' && /Bitkeep/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.bitget),
    // deeplink: 'https://bkcode.vip?action=dapp&url=' + encodeURIComponent(location.href),
  },

  [ConnectorId['okxWalletBtc']]: {
    id: ConnectorId['okxWalletBtc'],
    name: 'OKX Wallet',
    logoImg: OKX.src,
    url: 'https://www.okx.com/download',
    type: 'btc',
  },
  [ConnectorId['unisatWallet']]: {
    id: ConnectorId['unisatWallet'],
    name: 'UniSat Wallet',
    logoImg: unisatImg.src,
    url: 'https://unisat.io/',
    type: 'btc',
  },
  [ConnectorId['Trust']]: {
    id: ConnectorId['Trust'],
    name: 'Trust',
    logoImg: trustImg.src,
    url: 'https://trustwallet.com/',
    type: 'solana',
    isInApp: typeof navigator !== 'undefined' && /Trust/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.trust),
  },
  [ConnectorId['Phantom']]: {
    id: ConnectorId['Phantom'],
    name: 'Phantom',
    logoImg: phantomImg.src,
    url: 'https://phantom.app/',
    type: 'solana',
    isInApp: typeof navigator !== 'undefined' && /Phantom/i.test(navigator.userAgent),
    // deeplink: `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(location.href)}`,
    ...generateDeeplink(WALLET_CONFIGS.phantom),
  },
  [ConnectorId['Solflare']]: {
    id: ConnectorId['Solflare'],
    name: 'Solflare',
    logoImg: solflareImg.src,
    url: 'https://solflare.com/',
    type: 'solana',
    isInApp: typeof navigator !== 'undefined' && /Solflare/i.test(navigator.userAgent),
    // deeplink: `https://solflare.com/app/dapp?url=${encodeURIComponent(location.href)}`,
    ...generateDeeplink(WALLET_CONFIGS.solflare),
  },
  [ConnectorId['TokenPocket']]: {
    id: ConnectorId['TokenPocket'],
    name: 'TokenPocket',
    logoImg: tpImg.src,
    url: 'https://www.tokenpocket.pro/',
    type: 'tron',
    isInApp: typeof navigator !== 'undefined' && /TokenPocket/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.tokenpocket),
  },
  [ConnectorId['Bitget Wallet']]: {
    id: ConnectorId['Bitget Wallet'],
    name: 'Bitget Wallet',
    logoImg: bkImg.src,
    url: 'https://bitkeep.com/',
    type: 'tron',
    isInApp: typeof navigator !== 'undefined' && /Bitkeep/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.bitget),
  },
  [ConnectorId['OKX Wallet']]: {
    id: ConnectorId['OKX Wallet'],
    name: 'OKX Wallet',
    logoImg: OKX.src,
    url: 'https://www.okx.com/download',
    type: 'tron',
    isInApp: typeof navigator !== 'undefined' && /OKApp/i.test(navigator.userAgent),
    ...generateDeeplink(WALLET_CONFIGS.okx),
  },
}
const langs = {
  en: {
    'Connect Wallet': 'Connect Wallet',
    'Please install app first.': 'Please install app first.',
    'Welcome to DeBox': `Welcome to DeBox`,
    'Welcome to DeSwap': `Welcome to DeSwap`,
    'Please select the wallet to connect to': `Open in your wallet`,
    "Connect your current account's EVM wallet first": `Connect your current account's EVM wallet first`,
    "Connect your current account's Bitcoin wallet first": `Connect your current account's Bitcoin wallet first`,
    "Connect your current account's Solana wallet first": `Connect your current account's Solana wallet first`,
    "Connect your current account's Tron wallet first": `Connect your current account's Tron wallet first`,
  },
  zh: {
    'Connect Wallet': '连接钱包',
    'Please install app first.': '请先安装应用',
    'Welcome to DeBox': `欢迎来到DeBox`,
    'Welcome to DeSwap': `欢迎来到DeSwap`,
    'Please select the wallet to connect to': '连接你的钱包',
    "Connect your current account's EVM wallet first": `请先连接当前账号的EVM钱包再进行操作`,
    "Connect your current account's Bitcoin wallet first":
      '请先连接当前账号的Bitcoin钱包再进行操作',
    "Connect your current account's Solana wallet first": `请先连接当前账号的Solana钱包再进行操作`,
    "Connect your current account's Tron wallet first": `请先连接当前账号的Tron钱包再进行操作`,
  },
}

// 修改检查应用是否安装的函数
const checkIfAppInstalled = async (deeplink: string, store?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (store) {
        window.location.href = store
      }
      resolve(false)
    }, 2500)

    window.location.href = deeplink
    window.onblur = () => {
      clearTimeout(timer)
      resolve(true)
    }
  })
}

export const ConnectWalletMulti = ({ onClose, locale = 'en', data, customComponents }: TProps) => {
  const walletType = data?.walletType

  const lang = langs[locale] || langs['en']

  const tabs = useMemo(() => {
    const arr = [
      {
        type: 'evm',
        title: 'EVM',
        component: <EVMBox onClose={onClose} lang={lang} walletType={walletType} />,
        disable: walletType && walletType !== 'evm',
      },
      {
        type: 'solana',
        title: 'SOL',
        component: <SolanaBox onClose={onClose} lang={lang} walletType={walletType} />,
        disable: walletType && walletType !== 'solana',
      },
      {
        type: 'btc',
        title: 'BTC',
        component: <BTCBox onClose={onClose} lang={lang} walletType={walletType} />,
        disable: (walletType && walletType !== 'btc') || data?.hasNoBtc,
      },
      {
        type: 'tron',
        title: 'TRON',
        component: <TRONBox onClose={onClose} lang={lang} walletType={walletType} />,
        disable: walletType && walletType !== 'tron',
      },
    ]

    // 合并自定义组件
    if (Array.isArray(customComponents) && customComponents.length > 0) {
      arr.unshift(...customComponents)
    }

    return arr
  }, [lang, data?.hasNoBtc, walletType, onClose, customComponents])

  const defaultIndex = tabs?.findIndex((item) => !item?.disable) || 0
  const [activeTabIndex, setActiveTabIndex] = useState(defaultIndex)

  const handleTabChange = (index: number) => {
    setActiveTabIndex(index)
  }

  // 检查当前活动标签页是否为二维码标签页
  const isQRCodeActive = tabs[activeTabIndex]?.type === 'qrcode'

  return (
    <Box
      color="rgba(45, 45, 45, 1)"
      pos={'relative'}
      px={{
        base: px2vw(40),
        lg: '27px',
      }}
      py={{
        base: px2vw(60),
        lg: '40px',
      }}
      w={{
        lg: '500px',
      }}
      maxH={{
        base: '90vh',
        lg: '100vh',
      }}
      overflowY={isQRCodeActive ? 'hidden' : 'auto'}
      className="cal_bottom"
    >
      <Image
        src={data?.brandLogo || (data?.isDeSwap ? DeswpLogoImg.src : logoImg.src)}
        alt={data?.brandLogo ? 'USDX' : ''}
        objectFit={data?.brandLogo ? 'cover' : undefined}
        borderRadius={data?.brandLogo ? 'full' : data?.isDeSwap ? '10px' : 'none'}
        w={{
          base: px2vw(100),
          lg: '50px',
        }}
        h={{
          base: px2vw(100),
          lg: '50px',
        }}
        m="auto"
        mt={{
          base: px2vw(2),
          lg: '2px',
        }}
        mb={{
          base: px2vw(22),
          lg: '16px',
        }}
      />
      <Text
        textAlign={'center'}
        fontSize={{
          base: px2vw(42),
          lg: '24px',
        }}
        fontWeight={600}
        mb="2px"
      >
        {data?.welcomeTitle ||
          (data?.isDeSwap ? lang['Welcome to DeSwap'] : lang['Welcome to DeBox'])}
      </Text>
      <Text
        textAlign={'center'}
        fontSize={{
          base: px2vw(28),
          lg: '16px',
        }}
      >
        {walletType === 'evm'
          ? lang["Connect your current account's EVM wallet first"]
          : walletType === 'btc'
          ? lang["Connect your current account's Bitcoin wallet first"]
          : walletType === 'solana'
          ? lang["Connect your current account's Solana wallet first"]
          : lang['Please select the wallet to connect to']}
      </Text>

      <Tabs 
        variant="unstyled" 
        mt="31px" 
        defaultIndex={defaultIndex} 
        key={defaultIndex}
        onChange={handleTabChange}
      >
        <TabList
          bgColor={'#F3F5F7'}
          borderRadius={'10px'}
          h={{
            base: px2vw(88),
            lg: '44px',
          }}
          display={'flex'}
          p="4px"
        >
          {tabs?.map((item) => {
            return (
              <Tab
                flex={1}
                key={item?.type}
                _selected={{ color: '#1d1d1d', bg: '#fff' }}
                fontSize={{ base: px2vw(28), lg: '14px' }}
                color={'#6D6D6D'}
                borderRadius={'9px'}
                isDisabled={item?.disable}
              >
                {item?.title}
              </Tab>
            )
          })}
        </TabList>
        <TabPanels
          p="0"
          mt={{
            base: px2vw(20),
            lg: '24px',
          }}
        >
          {tabs?.map((item, index) => {
            // 检查是否是 QR Code 组件
            const isQRCodeTab = item?.type === 'qrcode'
            // 只有当是 QR Code 组件时才传递 isVisible 属性
            let component = item?.component
            if (isQRCodeTab && React.isValidElement(component)) {
              // 使用类型断言告诉 TypeScript isVisible 和 onClose 是有效的属性
              component = React.cloneElement(component as React.ReactElement<{ isVisible?: boolean; onClose?: () => void }>, {
                isVisible: index === activeTabIndex,
                onClose: onClose
              })
            }
            
            return (
              <TabPanel p="0" key={item?.type}>
                {index === activeTabIndex && component}
              </TabPanel>
            )
          })}
        </TabPanels>
      </Tabs>
    </Box>
  )
}

type ItemTProps = {
  onClose: any
  lang: (typeof langs)['en']
  walletType?: string
}

const EVMBox = ({ onClose, lang }: ItemTProps) => {
  const { connectAsync, connectors, isPending: isLoading } = useConnect()
  const [pendingConnector, setPendingConnector] = useState<null | Connector>(null)

  const [errorMsg, setMsg] = useState({
    key: '',
    value: '',
  })

  // 修改处理钱包连接的函数
  const handleEvmWalletConnect = async (item: any) => {
    setMsg({ key: '', value: '' })

    try {
      if (item?.id === ConnectorId['walletConnect']) {
        onClose?.()
      }

      if (item?.connector) {
        setPendingConnector(item?.connector || null)
        const res = await connectAsync({
          connector: item?.connector as Connector,
        })
        setPendingConnector(null)
        if (res) {
          onClose?.()
          return
        }
      } else {
        if (isMobile() && !item?.isInApp && item?.deeplink) {
          const isAppInstalled = await checkIfAppInstalled(item?.deeplink, item?.store)
          if (!isAppInstalled) {
            setMsg({
              key: item?.id,
              value: lang['Please install app first.'],
            })
          }
        } else {
          setMsg({
            key: item?.id,
            value: lang['Please install app first.'],
          })
        }
      }
    } catch (error: any) {
      setMsg({
        key: item?.id,
        value: error?.shortMessage || error.message,
      })
      setPendingConnector(null)
    }
  }

  const evmWallet = useMemo(() => {
    // 检查是否在币安APP中
    const inBinanceApp = isInBinance() || (typeof window !== 'undefined' && window.ethereum?.isBinance);

    // 检查是否有注入的币安钱包connector
    const injectedBinanceConnector = connectors?.find((connector) => 
      connector?.id === 'BinanceW3WSDK' || 
      connector?.id === 'wallet.binance.com'
    );

    // 获取其他EVM钱包
    const otherWallets = Object.keys(cfgs)
      .filter(key => key !== ConnectorId['BinanceW3WSDK'])
      .map((key) => {
        const item = cfgs[key as ConnectorId]
        if (item.type === 'evm') {
          return {
            ...item,
            connector: connectors?.find((connector) => connector?.id === key),
          }
        }
        return null
      })
      ?.filter((item) => item)

    // 获取额外的EVM注入钱包
    const additionalConnectors = connectors
      ?.filter(
        (connector) =>
          !otherWallets.find((wallet) => wallet?.connector?.id === connector.id) &&
          connector.type === 'injected' &&
          connector?.id !== 'BinanceW3WSDK' && 
          connector?.id !== 'wallet.binance.com'
      )
      .slice(0, 2) // 最多取2个额外的

    // 找到没有connector的钱包索引
    const noConnectorWalletIndexes = otherWallets
      .map((wallet, index) => (!wallet?.connector ? index : -1))
      .filter((index) => index !== -1)

    // 将额外的注入钱包替换没有connector的钱包,如果没有则添加到列表中
    additionalConnectors?.forEach((connector, index) => {
      if (noConnectorWalletIndexes[index] !== undefined) {
        // 替换没有connector的钱包
        otherWallets[noConnectorWalletIndexes[index]] = {
          id: connector.id,
          name: connector.name,
          type: 'evm' as TWalletType,
          connector: connector,
          logoImg: connector?.icon || '',
          url: '',
        }
      } else {
        // 如果没有需要替换的钱包,则添加到列表中
        otherWallets.push({
          id: connector.id,
          name: connector.name,
          type: 'evm' as TWalletType,
          connector: connector,
          logoImg: connector?.icon || '',
          url: '',
        })
      }
    })

    // 如果在币安APP中，直接返回其他钱包列表
    if (inBinanceApp) {
      return otherWallets;
    }

    // 如果有注入的币安钱包connector，使用注入的connector
    // 如果没有注入的connector，使用配置的币安钱包
    const binanceWallet = injectedBinanceConnector ? {
      id: injectedBinanceConnector.id,
      name: 'Binance Wallet',
      type: 'evm' as TWalletType,
      connector: injectedBinanceConnector,
      logoImg: 'https://data.debox.pro/token/icon/swap_select_bnb.png',
      url: 'https://www.binance.com/en/wallet',
    } : {
      ...cfgs[ConnectorId['BinanceW3WSDK']],
      connector: undefined
    };

    // 将币安钱包放在第二位
    const firstWallet = otherWallets[0];
    otherWallets[0] = binanceWallet;
    return [firstWallet, ...otherWallets];
  }, [connectors])

  return (
    <Grid
      mt={{
        base: px2vw(22),
        lg: '16px',
      }}
      templateRows="repeat(1, 1fr)"
      templateColumns="repeat(2, 1fr)"
      gap={{
        base: px2vw(18),
        lg: '16px',
      }}
    >
      {Array.isArray(evmWallet) &&
        evmWallet?.map((item, index) => {
          if (!item) {
            return null
          }

          return (
            <GridItem overflow={'hidden'} key={item?.id} rowSpan={1} colSpan={index === 0 && evmWallet.length % 2 === 1 ? 2 : 1}>
              <Button
                aria-label="Browser wallet"
                isDisabled={isLoading}
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEvmWalletConnect(item)
                }}
                w="full"
                leftIcon={
                  <Image
                    src={item.logoImg || item.connector?.icon}
                    w={{ base: px2vw(60), lg: '30px' }}
                    h={{ base: px2vw(60), lg: '30px' }}
                    borderRadius={index === 0 ? '' : 'full'}
                    ignoreFallback
                    alt={item.name}
                    objectFit="contain"
                  />
                }
                rightIcon={
                  isLoading && pendingConnector?.id === item?.id ? (
                    <Loading size={'xs'} />
                  ) : item?.connector && // TODO: fix injected icon
                    (item?.connector?.id === ConnectorId['injected']
                      ? typeof window !== 'undefined' && window?.ethereum
                      : true) ? (
                    <Box
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg="green.400"
                      boxShadow="0 0 0 2px white"
                      position="absolute"
                      right="2"
                      top="50%"
                      transform="translateY(-50%)"
                    />
                  ) : (
                    <></>
                  )
                }
                variant="outline"
                height={{ base: px2vw(86), lg: '48px' }}
                borderRadius={{ base: px2vw(20), lg: '10px' }}
                borderColor={'rgba(228, 228, 231, 1)'}
                justifyContent="space-between"
                px={{ base: px2vw(15), lg: '15px' }}
              >
                <Stack
                  flex={1}
                  w={'0'}
                  spacing={{ base: px2vw(8), lg: '4px' }}
                  direction="column"
                  alignItems="flex-start"
                  justifyContent="flex-start"
                  pl={'2px'}
                >
                  <Text
                    fontSize={{
                      base: px2vw(24),
                      lg: '16px',
                    }}
                    flex={1}
                    textAlign="left"
                  >
                    {item.name}
                  </Text>
                  {errorMsg.key === item.id && errorMsg.value && (
                    <Text
                      w={'100%'}
                      textStyle="12"
                      color="red.300"
                      overflow="hidden"
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                      textAlign={'left'}
                    >
                      {errorMsg.value}
                    </Text>
                  )}
                </Stack>
              </Button>
            </GridItem>
          )
        })}
    </Grid>
  )
}

const BTCBox = ({ onClose, lang }: ItemTProps) => {
  const {
    connectAsync: connectAsyncBtc,
    connectors: connectorsBtc,
    isLoading: isLoadingBtc,
    pendingConnector: pendingConnectorBtc,
  } = useConnectBtc()

  const [errorMsg, setMsg] = useState({
    key: '',
    value: '',
  })

  return (
    <Grid
      mt={{
        base: px2vw(22),
        lg: '16px',
      }}
      gap={{
        base: px2vw(18),
        lg: '16px',
      }}
      templateRows="repeat(1, 1fr)"
      templateColumns="repeat(2, 1fr)"
    >
      {Array.isArray(connectorsBtc) &&
        connectorsBtc?.map((connector, index) => {
          const item = cfgs[connector.id as 'injected']
          return (
            <GridItem
              overflow={'hidden'}
              key={connector.id}
              rowSpan={1}
              colSpan={connectorsBtc?.length % 2 === 0 ? 1 : index === 0 ? 2 : 1}
            >
              <Button
                aria-label={item.name}
                isDisabled={isLoadingBtc}
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()

                  setMsg({
                    key: '',
                    value: '',
                  })

                  try {
                    const res = await connectAsyncBtc({ connector })

                    if (res) {
                      onClose?.()
                    } else {
                      setMsg({
                        key: connector.id,
                        value: lang['Please install app first.'],
                      })
                    }
                  } catch (e: any) {
                    setMsg({
                      key: connector.id,
                      value: e.message,
                    })
                  }
                }}
                w="full"
                leftIcon={
                  <Image
                    src={item.logoImg}
                    w={{ base: px2vw(60), lg: '30px' }}
                    h={{ base: px2vw(60), lg: '30px' }}
                    ignoreFallback
                    alt={connector.name}
                    objectFit="contain"
                  />
                }
                rightIcon={
                  isLoadingBtc && connector.id === pendingConnectorBtc?.id ? (
                    <Loading size={'xs'} />
                  ) : (
                    <></>
                  )
                }
                variant="outline"
                height={{ base: px2vw(86), lg: '48px' }}
                borderRadius={{ base: px2vw(20), lg: '10px' }}
                borderColor={'rgba(228, 228, 231, 1)'}
                justifyContent="space-between"
                px={{ base: px2vw(15), lg: '15px' }}
              >
                <Stack
                  flex={1}
                  w={'0'}
                  spacing={{ base: px2vw(8), lg: '4px' }}
                  direction="column"
                  alignItems="flex-start"
                  justifyContent="flex-start"
                  pl={'2px'}
                >
                  <Text
                    fontSize={{
                      base: px2vw(24),
                      lg: '16px',
                    }}
                    flex={1}
                    textAlign="left"
                  >
                    {item.name}
                  </Text>
                  {errorMsg.key === connector.id && errorMsg.value && (
                    <Text
                      w={'100%'}
                      textStyle="12"
                      color="red.300"
                      overflow="hidden"
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                      textAlign={'left'}
                    >
                      {errorMsg.value}
                    </Text>
                  )}
                </Stack>
              </Button>
            </GridItem>
          )
        })}
    </Grid>
  )
}

const SolanaBox = ({ onClose, lang, walletType }: ItemTProps) => {
  const [errorMsg, setMsg] = useState({
    key: '',
    value: '',
  })

  const {
    connect: connectSolana, // 用于连接已选择的钱包
    select: selectSolana, // 用于选择要连接的钱包
    connecting: isLoadingSolana, // 表示钱包连接状态,true表示正在连接中
    wallet: solwallet, // 当前已连接的钱包实例
    wallets: solWallets, // 所有可用的Solana钱包列表
    disconnect: disconnectSolana, // 用于断开当前连接的钱包
    publicKey, // 当前连接钱包的公钥,用于后续交易使用
    connected,
  } = useSolanaWallet()

  // 连接sol钱包
  useEffect(() => {
    const connectSelectedWallet = async () => {
      // 如果没有选中钱包或者没有选择适配器名称,则直接返回
      if (!solwallet || solwallet.readyState !== 'Installed') return

      try {
        // 确保钱包已准备就绪,如果钱包已安装则尝试连接
        await connectSolana()
      } catch (error: any) {
        console.error('Solana connect error:', error)
        setMsg({
          key: solwallet.adapter.name,
          value: error.message || WALLET_ERRORS.CONNECTION_ERROR,
        })
      }
    }
    // 执行连接钱包的函数
    connectSelectedWallet()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solwallet])

  // 主要用于连接完后，关闭弹窗
  useEffect(() => {
    // 检查钱包连接状态
    const checkConnectionStatus = async () => {
      const walletAddress = publicKey?.toBase58()

      const isSolanaWallet = walletType === 'solana' || !walletType

      // 如果钱包已连接但没有地址,说明连接异常,需要断开连接，主要是Phantom钱包
      if (connected && !walletAddress) {
        await disconnectSolana?.()
        await selectSolana(null)
        return
      }

      // 当钱包连接成功且有地址时,如果是Solana钱包则关闭弹窗 ，因为connectSolana 没有返回，所以要用这个方法
      if (connected && walletAddress && isSolanaWallet) {
        onClose?.()
      }
    }

    checkConnectionStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    connected,
    publicKey,
    walletType, // 监听钱包类型变化
  ])

  const handleSolanaConnect = async (wallet: SolanaWallet) => {
    // 主要针对Phantom钱包，谷歌的Phantom钱包杀不死，开源库的bug，edge的是没问题的,其他钱包没这个情况，需要点击两次，所以需要断开连接
    // TODO: 后续看看能不能解决
    if (wallet?.adapter.connected && !publicKey) {
      await disconnectSolana?.()
      await selectSolana(null)
      return
    }
    // 获取钱包配置
    const walletConfig = cfgs[wallet.adapter.name as ConnectorId]

    try {
      setMsg({ key: '', value: '' })
      // 检查钱包是否已安装
      if (wallet.readyState !== 'Installed') {
        if (isMobile() && !walletConfig?.isInApp && walletConfig?.deeplink) {
          const isAppInstalled = await checkIfAppInstalled(walletConfig?.deeplink)
          if (!isAppInstalled) {
            setMsg({
              key: wallet.adapter?.name,
              value: lang['Please install app first.'],
            })
            //加上sol 钱包的deeplink
            window.open(wallet.adapter.url, '_blank')
          }
        } else {
          setMsg({
            key: wallet.adapter?.name,
            value: lang['Please install app first.'],
          })
          //加上sol 钱包的deeplink
          window.open(wallet.adapter.url, '_blank')
        }

        return
      }

      // 先选择钱包
      await selectSolana(wallet.adapter.name)
    } catch (error: any) {
      console.error('Solana wallet connection error:', error)
      setMsg({
        key: wallet.adapter?.name,
        value: error.message || WALLET_ERRORS.CONNECTION_ERROR,
      })
    }
  }

  return (
    <Grid
      mt={{
        base: px2vw(22),
        lg: '16px',
      }}
      templateRows="repeat(1, 1fr)"
      templateColumns="repeat(2, 1fr)"
      gap={{
        base: px2vw(18),
        lg: '16px',
      }}
    >
      {Array.isArray(solWallets) &&
        solWallets
          ?.filter((wallet, index, self) => 
            index === self.findIndex(w => w?.adapter.name === wallet?.adapter.name)
          )
          ?.sort((a, b) => {
            // Trust 排在最前面
            if (a?.adapter.name === 'Trust') return -1
            if (b?.adapter.name === 'Trust') return 1
            return 0
          })
          ?.slice(0, 5) // 限制最多显示5个
          ?.map((item, index) => {
            if (!item) {
              return null
            }
            return (
              <GridItem
                overflow={'hidden'}
                key={item.adapter.name}
                rowSpan={1}
                colSpan={solWallets?.length % 2 === 0 ? 1 : index === 0 ? 2 : 1}
              >
                <Button
                  aria-label={item.adapter.name}
                  isDisabled={isLoadingSolana}
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSolanaConnect(item)
                  }}
                  w="full"
                  leftIcon={
                    <Image
                      src={item.adapter.name === 'Trust' ? trustImg.src : item.adapter.icon || ''}
                      w={{ base: px2vw(60), lg: '30px' }}
                      h={{ base: px2vw(60), lg: '30px' }}
                      ignoreFallback
                      alt={item.adapter.name}
                      objectFit="contain"
                    />
                  }
                  rightIcon={
                    isLoadingSolana && item.adapter.name === solwallet?.adapter?.name ? (
                      <Loading size={'xs'} />
                    ) : item?.readyState === 'Installed' ? (
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        bg="green.400"
                        boxShadow="0 0 0 2px white"
                        position="absolute"
                        right="2"
                        top="50%"
                        transform="translateY(-50%)"
                      />
                    ) : (
                      <></>
                    )
                  }
                  variant="outline"
                  height={{ base: px2vw(86), lg: '48px' }}
                  borderRadius={{ base: px2vw(20), lg: '10px' }}
                  borderColor={'rgba(228, 228, 231, 1)'}
                  justifyContent="space-between"
                  px={{ base: px2vw(15), lg: '15px' }}
                >
                  <Stack
                    flex={1}
                    w={'0'}
                    spacing={{ base: px2vw(8), lg: '4px' }}
                    direction="column"
                    alignItems="flex-start"
                    justifyContent="flex-start"
                    pl={'2px'}
                  >
                    <Text
                      fontSize={{
                        base: px2vw(24),
                        lg: '16px',
                      }}
                      flex={1}
                      textAlign="left"
                    >
                      {item.adapter.name}
                    </Text>
                    {errorMsg.key === item.adapter.name && errorMsg.value && (
                      <Text
                        w={'100%'}
                        textStyle="12"
                        color="red.300"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                        textAlign={'left'}
                      >
                        {errorMsg.value}
                      </Text>
                    )}
                  </Stack>
                </Button>
              </GridItem>
            )
          })}
    </Grid>
  )
}

const TRONBox = ({ onClose, lang, walletType }: ItemTProps) => {
  const [errorMsg, setMsg] = useState({
    key: '',
    value: '',
  })

  const {
    connect: connectTron,
    select: selectTron,
    connected: isTronConnected,
    connecting: isLoadingTron,
    wallet: tronWallet,
    wallets: tronWallets,
    address: tronAddress,
  } = useTronWallet()

  useEffect(() => {
    const connectSelectedWallet = async () => {
      // 如果没有选中钱包或者没有选择适配器名称,则直接返回
      if (!tronWallet || tronWallet.state === 'NotFound') return

      try {
        // 确保钱包已准备就绪,如果钱包已安装则尝试连接
        await connectTron()
      } catch (error: any) {
        setMsg({
          key: tronWallet.adapter.name,
          value: error.message || WALLET_ERRORS.CONNECTION_ERROR,
        })
      }
    }
    connectSelectedWallet()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tronWallet])

  // 主要用于连接完后，关闭弹窗
  useEffect(() => {
    const isTWallet = walletType === 'tron' || !walletType
    if (isTronConnected && tronAddress && isTWallet) {
      onClose?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTronConnected, tronAddress, walletType])

  const handleTronConnect = async (wallet: TronWallet) => {
    // 获取钱包配置
    const walletConfig = cfgs[wallet.adapter.name as ConnectorId]

    try {
      setMsg({ key: '', value: '' })
      // 检查钱包是否已安装
      if (wallet.state === 'NotFound') {
        if (isMobile() && !walletConfig?.isInApp && walletConfig?.deeplink) {
          const isAppInstalled = await checkIfAppInstalled(walletConfig?.deeplink)
          if (!isAppInstalled) {
            setMsg({
              key: wallet.adapter?.name,
              value: lang['Please install app first.'],
            })
            window.open(wallet.adapter.url, '_blank')
          }
        } else {
          setMsg({
            key: wallet.adapter?.name,
            value: lang['Please install app first.'],
          })
          window.open(wallet.adapter.url, '_blank')
        }

        return
      }

      // 先选择钱包
      await selectTron(wallet.adapter.name)
    } catch (error: any) {
      setMsg({
        key: wallet.adapter?.name,
        value: error.message || WALLET_ERRORS.CONNECTION_ERROR,
      })
    }
  }

  return (
    <Grid
      mt={{
        base: px2vw(22),
        lg: '16px',
      }}
      templateRows="repeat(1, 1fr)"
      templateColumns="repeat(2, 1fr)"
      gap={{
        base: px2vw(18),
        lg: '16px',
      }}
    >
      {Array.isArray(tronWallets) &&
        tronWallets
          ?.filter((wallet, index, self) => 
            index === self.findIndex(w => w?.adapter.name === wallet?.adapter.name)
          )
          ?.map((item, index) => {
          if (!item) {
            return null
          }
          return (
            <GridItem
              overflow={'hidden'}
              key={item.adapter.name}
              rowSpan={1}
              colSpan={tronWallets?.length % 2 === 0 ? 1 : index === 0 ? 2 : 1}
            >
              <Button
                aria-label={item.adapter.name}
                isDisabled={isLoadingTron}
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleTronConnect(item)
                }}
                w="full"
                leftIcon={
                  <Image
                    src={item.adapter.name === 'Trust' ? trustImg.src : item.adapter.icon || ''}
                    w={{ base: px2vw(60), lg: '30px' }}
                    h={{ base: px2vw(60), lg: '30px' }}
                    ignoreFallback
                    alt={item.adapter.name}
                    objectFit="contain"
                  />
                }
                rightIcon={
                  isLoadingTron && item.adapter.name === tronWallet?.adapter?.name ? (
                    <Loading size={'xs'} />
                  ) : item?.state !== 'NotFound' ? (
                    <Box
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg="green.400"
                      boxShadow="0 0 0 2px white"
                      position="absolute"
                      right="2"
                      top="50%"
                      transform="translateY(-50%)"
                    />
                  ) : (
                    <></>
                  )
                }
                variant="outline"
                height={{ base: px2vw(86), lg: '48px' }}
                borderRadius={{ base: px2vw(20), lg: '10px' }}
                borderColor={'rgba(228, 228, 231, 1)'}
                justifyContent="space-between"
                px={{ base: px2vw(15), lg: '15px' }}
              >
                <Stack
                  flex={1}
                  w={'0'}
                  spacing={{ base: px2vw(8), lg: '4px' }}
                  direction="column"
                  alignItems="flex-start"
                  justifyContent="flex-start"
                  pl={'2px'}
                >
                  <Text
                    fontSize={{
                      base: px2vw(24),
                      lg: '16px',
                    }}
                    flex={1}
                    textAlign="left"
                  >
                    {item.adapter.name}
                  </Text>
                  {errorMsg.key === item.adapter.name && errorMsg.value && (
                    <Text
                      w={'100%'}
                      textStyle="12"
                      color="red.300"
                      overflow="hidden"
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                      textAlign={'left'}
                    >
                      {errorMsg.value}
                    </Text>
                  )}
                </Stack>
              </Button>
            </GridItem>
          )
        })}
    </Grid>
  )
}
