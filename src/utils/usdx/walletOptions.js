const { usdxT } = require('./usdxI18n')

const WALLET_DEFINITIONS = [
  {
    id: 'debox',
    name: 'DeBox Wallet',
    description: 'Recommended · in-app connect',
    icon: 'box',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Browser extension / mobile app',
    icon: 'hexagon',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Scan to connect any wallet',
    icon: 'scan-line',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    description: 'Browser extension / mobile app',
    icon: 'circle-dot',
  },
]

const normalizedIdentity = (connector) =>
  `${connector?.id || ''} ${connector?.name || ''} ${connector?.type || ''}`.toLowerCase()

const isWalletConnect = (connector) => /wallet[ -]?connect/.test(normalizedIdentity(connector))
const isMetaMask = (connector) => /io\.metamask|meta[ -]?mask/.test(normalizedIdentity(connector))
const isOkx = (connector) => /com\.okex\.wallet|okex|okx/.test(normalizedIdentity(connector))
const isBinance = (connector) => /binance/.test(normalizedIdentity(connector))
const isInjected = (connector) =>
  connector?.type === 'injected' ||
  connector?.id === 'injected' ||
  isMetaMask(connector) ||
  isOkx(connector)
const isNamedDeBox = (connector) => /debox/.test(normalizedIdentity(connector))
const DEBOX_PROVIDER_PROBE_DELAYS_MS = [100, 300, 700, 1500, 3000]

const getNextDeBoxProviderProbeDelay = (attempt, discovered) => {
  if (discovered) return null
  return DEBOX_PROVIDER_PROBE_DELAYS_MS[attempt] ?? null
}

const isVerifiedDeBoxProvider = (provider, knownDeBoxProviders = []) => {
  if (!provider || typeof provider !== 'object') return false
  if (knownDeBoxProviders.includes(provider)) return true
  return Boolean(provider.isDeBox || provider.isDebox || provider.isDeBoxWallet)
}

/**
 * Resolve the fixed USDX wallet list without ever falling back between injected brands.
 * @param {readonly { id: string, name?: string, type?: string }[]} connectors
 * @param {{ verifiedDeBoxConnectors?: readonly { id: string, name?: string, type?: string }[] }} environment
 */
const resolveUsdxWalletOptions = (connectors, environment = {}) => {
  const usable = connectors.filter((connector) => !isBinance(connector))
  const namedDeBoxConnector = usable.find(
    (connector) => isNamedDeBox(connector) && isInjected(connector)
  )
  const verifiedDeBoxConnectors = environment.verifiedDeBoxConnectors || []
  const debox =
    namedDeBoxConnector ||
    usable.find(
      (connector) =>
        verifiedDeBoxConnectors.includes(connector) &&
        isInjected(connector) &&
        !isMetaMask(connector) &&
        !isOkx(connector) &&
        !isWalletConnect(connector)
    ) ||
    null
  const matched = {
    debox,
    metamask: usable.find(isMetaMask) || null,
    walletconnect: usable.find(isWalletConnect) || null,
    okx: usable.find(isOkx) || null,
  }

  return WALLET_DEFINITIONS.map((definition) => {
    const connector = matched[definition.id] || null
    return { ...definition, description: usdxT(definition.description), connector, available: Boolean(connector) }
  })
}

const getUsdxMineWalletGate = (walletState) => {
  if (walletState === 'off') {
    return {
      visible: true,
      label: usdxT('Connect Wallet'),
      description: usdxT('Connect your wallet to view USDX assets'),
      action: 'open-wallet',
    }
  }
  if (walletState === 'wrong') {
    return {
      visible: true,
      label: usdxT('Switch Network'),
      description: usdxT('Switch to BNB Smart Chain to view USDX assets'),
      action: 'switch-chain',
    }
  }
  return { visible: false, action: null }
}

const getUsdxWalletName = (connector) => {
  const match = resolveUsdxWalletOptions([connector]).find(
    (option) => option.connector === connector
  )
  return match?.name || connector?.name || usdxT('Wallet')
}

module.exports = {
  WALLET_DEFINITIONS,
  getNextDeBoxProviderProbeDelay,
  getUsdxMineWalletGate,
  getUsdxWalletName,
  isVerifiedDeBoxProvider,
  resolveUsdxWalletOptions,
}
