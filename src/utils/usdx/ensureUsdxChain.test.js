const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  ensureUsdxWalletChain,
  readProviderChainId,
  resolveUsdxWalletClient,
  toHexChainId,
} = require('./ensureUsdxChain')

describe('ensureUsdxWalletChain', () => {
  it('hex chain id formats BSC', () => {
    assert.equal(toHexChainId(56), '0x38')
  })

  it('readProviderChainId prefers eth_chainId request', async () => {
    const id = await readProviderChainId({
      request: async ({ method }) => {
        assert.equal(method, 'eth_chainId')
        return '0xa'
      },
      getChainId: async () => 56,
    })
    assert.equal(id, 10)
  })

  it('returns when provider already on target chain', async () => {
    let switched = false
    await ensureUsdxWalletChain({
      targetChainId: 56,
      walletClient: {
        request: async ({ method }) => {
          if (method === 'eth_chainId') return '0x38'
          switched = true
        },
      },
      missingMessage: 'missing',
      switchMessage: 'switch',
    })
    assert.equal(switched, false)
  })

  it('switches via wallet_switchEthereumChain when mismatched', async () => {
    let chainHex = '0xa'
    const calls = []
    await ensureUsdxWalletChain({
      targetChainId: 56,
      walletClient: {
        request: async ({ method, params }) => {
          calls.push(method)
          if (method === 'eth_chainId') return chainHex
          if (method === 'wallet_switchEthereumChain') {
            assert.equal(params[0].chainId, '0x38')
            chainHex = '0x38'
            return null
          }
          throw new Error(`unexpected ${method}`)
        },
      },
      missingMessage: 'missing',
      switchMessage: 'switch',
    })
    assert.deepEqual(calls.filter((m) => m !== 'eth_chainId'), ['wallet_switchEthereumChain'])
    assert.equal(chainHex, '0x38')
  })

  it('forceSwitch still calls wallet_switch when already on target', async () => {
    let switches = 0
    await ensureUsdxWalletChain({
      targetChainId: 56,
      forceSwitch: true,
      walletClient: {
        request: async ({ method }) => {
          if (method === 'eth_chainId') return '0x38'
          if (method === 'wallet_switchEthereumChain') {
            switches += 1
            return null
          }
          throw new Error(`unexpected ${method}`)
        },
      },
      missingMessage: 'missing',
      switchMessage: 'switch',
    })
    assert.equal(switches, 1)
  })

  it('resolveUsdxWalletClient requires provider on target chain', async () => {
    const client = await resolveUsdxWalletClient({
      config: {},
      targetChainId: 56,
      switchMessage: 'switch',
      getWalletClient: async (_config, { chainId }) => {
        assert.equal(chainId, 56)
        return {
          chain: { id: 56 },
          request: async ({ method }) => {
            assert.equal(method, 'eth_chainId')
            return '0x38'
          },
        }
      },
    })
    assert.equal(client.chain.id, 56)

    await assert.rejects(
      () =>
        resolveUsdxWalletClient({
          config: {},
          targetChainId: 56,
          switchMessage: 'switch',
          getWalletClient: async () => ({
            chain: { id: 56 },
            request: async () => '0xa',
          }),
        }),
      /switch/
    )
  })
})
