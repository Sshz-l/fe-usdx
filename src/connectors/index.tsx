import { http, createConfig } from 'wagmi'
import getConfig from 'next/config'
import { walletConnect } from '@wagmi/connectors'
import { injected } from 'wagmi/connectors'
import { createClient, fallback, type Transport } from 'viem'
import { getWagmiConnectorV2 } from '@binance/w3w-wagmi-connector-v2'

import { CHAINS } from '@fe-common/sdk/src/constants/network'
import { getUserAuthHeaders } from '@/utils/auth'
import { isDeBoxApp } from '@/utils/wagmiConnector'
import { ensureWagmiStorageMigrated } from '@/utils/wagmiStorageMigration'

if (typeof window !== 'undefined') {
  ensureWagmiStorageMigrated()
}

const { publicRuntimeConfig } = getConfig()
/** WalletConnect 校验 metadata.url 与页面域名是否一致；siteUrl 为空（测试/预览）时用当前域名 */
const walletConnectSiteUrl: string =
  publicRuntimeConfig.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')
// 默认可用的 BSC 公共 RPC 节点列表
const bscRpcUrls = [
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-dataseed-public.bnbchain.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
]
// 基于 viem 的 fallback 排名能力启用健康检测与动态降级
// - rank: true 会定期采样延迟/稳定性并重排
// - AppKit 会在内部附加 Reown RPC 作为最终兜底（需提供 projectId）
let transports: Record<number, Transport> | undefined

// 仅在浏览器端启用传输与降级，避免 SSR 多实例造成周期采样的额外请求
if (typeof window !== 'undefined' && bscRpcUrls.length > 0) {
  const bscTransports = bscRpcUrls.map((url: string) => http(url)) as readonly Transport[]

  // 创建包含私有节点优先、公共节点兜底的传输配置
  const allTransports = [
    http(`${publicRuntimeConfig.rpcUrl}56`, {
      fetchOptions: {
        headers: {
          ...getUserAuthHeaders(),
        },
      },
    }),
    ...bscTransports,
  ] as readonly Transport[]

  const rankedFallback = fallback(allTransports, {
    // 关闭周期性排名采样，减少后台心跳请求；仅在实际失败时降级
    rank: false,
    // 适度重试一次，避免成倍放大请求量
    retryCount: 1,
    retryDelay: 300,
  })
  transports = {
    [56]: rankedFallback, // BSC chain ID is 56
  }
}

// 初始化币安钱包连接器 (使用 v2 版本)
const binanceConnector = getWagmiConnectorV2()()

const buildWagmiConfig = () => {
  const disablePersistence = typeof window !== 'undefined' && isDeBoxApp()

  return createConfig({
    chains: CHAINS,
    // DeBox WebView：native 每次注入新 provider，禁用 localStorage 持久化重连
    storage: disablePersistence ? null : undefined,
    connectors: [
      injected({
        shimDisconnect: false,
      }),
      binanceConnector, // 添加币安钱包连接器（放在第2位）
      walletConnect({
        isNewChainsStale: false,
        projectId: publicRuntimeConfig.walletConnect,
        metadata: {
          name: publicRuntimeConfig.title,
          description: publicRuntimeConfig.description,
          url: walletConnectSiteUrl,
          icons: [`${walletConnectSiteUrl}/images/apple-icon-144x144.png`],
        },
      }),
    ],
    client({ chain }) {
      // 如果是 BSC 链且有自定义传输配置，使用自定义传输
      if (chain.id === 56 && transports?.[56]) {
        return createClient({
          chain,
          transport: transports[56],
        })
      }

      // 其他链使用原有的 fallback 机制
      const customRpcUrl = `${publicRuntimeConfig.rpcUrl}${chain.id}`
      const rpcUrls = chain.id === 56 ? bscRpcUrls : []
      return createClient({
        chain,
        transport: fallback([
          http(customRpcUrl, {
            fetchOptions: {
              headers: getUserAuthHeaders(),
            },
          }),
          http(),
          ...rpcUrls.map((url) => http(url)),
        ]), //默认公共节点，自家节点做个备用
      })
    },
  })
}

let wagmiConfigSingleton: ReturnType<typeof buildWagmiConfig> | undefined

/**
 * 全局唯一 wagmi config。勿重复 createConfig，否则 localStorage 持久化的 connector
 * 会变成无方法的 plain object，触发 connection.connector.getChainId is not a function。
 */
export const createWagmiConfig = (_customHeaders?: Record<string, string>) => {
  if (!wagmiConfigSingleton) {
    wagmiConfigSingleton = buildWagmiConfig()
  }
  return wagmiConfigSingleton
}

export const wagmiConfig = createWagmiConfig()

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
