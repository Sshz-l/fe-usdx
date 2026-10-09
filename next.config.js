const path = require('path')

const { client: clientConfig } = require('./config')
const { version } = require('./package.json')

const transpilePackages = process.env.IGNORE_BUILD
  ? []
  : ['@wagmi', '@walletconnect', '@lit', 'lit-element', 'lit-html', 'viem', '@tanstack', 'abitype', '@noble', 'wagmi', '@lingui', 'unstorage', '@zag-js', '@popperjs']

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  compiler: {
    emotion: true,
    removeConsole: process.env.NODE_ENV === 'development' ? undefined : { exclude: ['error'] },
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  assetPrefix: clientConfig.cdn || undefined,
  basePath: clientConfig.basePath,
  experimental: { esmExternals: 'loose' },
  publicRuntimeConfig: {
    ...clientConfig,
    version: process.env.APP_VERSION || version,
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  },
  generateBuildId: async () => {
    return `FeUsdx_v${(process.env.APP_VERSION || version).replace('.', '_')}__${Date.now()}`
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // @walletconnect/solana-adapter 嵌套的 @noble/hashes 未导出 ./utils.js，统一指向 resolutions 锁定的顶层版本
      '@noble/hashes': path.join(__dirname, 'node_modules/@noble/hashes'),
      qrcode: path.join(__dirname, 'node_modules/qrcode'),
      // CJS require('@lingui/core')（USDX utils）与 ESM import 必须共用同一个 i18n 单例
      '@lingui/core$': path.join(__dirname, 'node_modules/@lingui/core/dist/index.cjs'),
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      }
    }
    config.module.rules.push({
      test: /\.po/,
      use: ['@lingui/loader'],
    })
    return config
  },
  transpilePackages,
}

module.exports = nextConfig
