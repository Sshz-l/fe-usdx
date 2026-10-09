const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getNextDeBoxProviderProbeDelay,
  getUsdxMineWalletGate,
  isVerifiedDeBoxProvider,
  resolveUsdxWalletOptions,
} = require('./walletOptions')

const connector = (id, name, type = 'injected') => ({ id, name, type })

test('wallet sheet always exposes the four authoritative wallets in fixed order', () => {
  const connectors = [
    connector('injected', 'DeBox Injected'),
    connector('io.metamask', 'MetaMask'),
    connector('walletConnect', 'WalletConnect', 'walletConnect'),
    connector('com.okex.wallet', 'OKX Wallet'),
    connector('binance', 'Binance Wallet', 'binance'),
  ]

  const options = resolveUsdxWalletOptions(connectors, {
    verifiedDeBoxConnectors: [connectors[0]],
  })

  assert.deepEqual(
    options.map(({ id, name, available }) => ({ id, name, available })),
    [
      { id: 'debox', name: 'DeBox Wallet', available: true },
      { id: 'metamask', name: 'MetaMask', available: true },
      { id: 'walletconnect', name: 'WalletConnect', available: true },
      { id: 'okx', name: 'OKX Wallet', available: true },
    ]
  )
  assert.equal(
    options.some((option) => /binance/i.test(option.name)),
    false
  )
})

test('missing injected wallets stay unavailable while WalletConnect remains available', () => {
  const walletConnect = connector('walletConnect', 'WalletConnect', 'walletConnect')
  const options = resolveUsdxWalletOptions([walletConnect])

  assert.deepEqual(
    options.map(({ id, available, connector }) => ({ id, available, connector })),
    [
      { id: 'debox', available: false, connector: null },
      { id: 'metamask', available: false, connector: null },
      { id: 'walletconnect', available: true, connector: walletConnect },
      { id: 'okx', available: false, connector: null },
    ]
  )
})

test('MetaMask never falls back to an OKX or generic injected connector', () => {
  const okx = connector('com.okex.wallet', 'OKX Wallet')
  const generic = connector('injected', 'Injected')
  const options = resolveUsdxWalletOptions([okx, generic])

  assert.equal(options.find((option) => option.id === 'metamask').connector, null)
  assert.equal(options.find((option) => option.id === 'okx').connector, okx)
  assert.equal(options.find((option) => option.id === 'debox').connector, null)
})

test('DeBox only uses an injected connector that was verified against its provider', () => {
  const generic = connector('injected', 'Injected')
  const off = resolveUsdxWalletOptions([generic])
  const on = resolveUsdxWalletOptions([generic], {
    verifiedDeBoxConnectors: [generic],
  })

  assert.equal(off.find((option) => option.id === 'debox').connector, null)
  assert.equal(on.find((option) => option.id === 'debox').connector, generic)
})

test('a generic injected connector stays unavailable when another DeBox provider exists', () => {
  const genericMetaMask = connector('injected', 'Injected')
  const namedMetaMask = connector('io.metamask', 'MetaMask')
  const options = resolveUsdxWalletOptions([genericMetaMask, namedMetaMask], {
    verifiedDeBoxConnectors: [],
  })

  assert.equal(options.find((option) => option.id === 'debox').connector, null)
  assert.equal(options.find((option) => option.id === 'metamask').connector, namedMetaMask)
})

test('multi-provider discovery verifies the exact DeBox provider, not the default MetaMask provider', () => {
  const deboxProvider = { isDeBox: true }
  const metaMaskProvider = { isMetaMask: true }

  assert.equal(isVerifiedDeBoxProvider(deboxProvider, [deboxProvider]), true)
  assert.equal(isVerifiedDeBoxProvider(metaMaskProvider, [deboxProvider]), false)
  assert.equal(isVerifiedDeBoxProvider({ isDeBoxWallet: true }, []), true)
})

test('late DeBox provider discovery uses finite retry delays and stops after discovery', () => {
  assert.equal(getNextDeBoxProviderProbeDelay(0, false), 100)
  assert.equal(getNextDeBoxProviderProbeDelay(1, false), 300)
  assert.equal(getNextDeBoxProviderProbeDelay(4, false), 3000)
  assert.equal(getNextDeBoxProviderProbeDelay(5, false), null)
  assert.equal(getNextDeBoxProviderProbeDelay(0, true), null)
})

test('an explicitly named DeBox injected connector is itself recognizable', () => {
  const debox = connector('app.debox.wallet', 'DeBox Wallet')
  const options = resolveUsdxWalletOptions([debox])

  assert.equal(options.find((option) => option.id === 'debox').connector, debox)
})

test('Mine maps off and wrong-network wallet states to different actions', () => {
  assert.deepEqual(getUsdxMineWalletGate('off'), {
    visible: true,
    label: 'Connect Wallet',
    description: 'Connect your wallet to view USDX assets',
    action: 'open-wallet',
  })
  assert.deepEqual(getUsdxMineWalletGate('wrong'), {
    visible: true,
    label: 'Switch Network',
    description: 'Switch to BNB Smart Chain to view USDX assets',
    action: 'switch-chain',
  })
  assert.deepEqual(getUsdxMineWalletGate('on'), { visible: false, action: null })
})
