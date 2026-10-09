const test = require('node:test')
const assert = require('node:assert/strict')

const {
  connectUsdxWalletExplicitly,
  disconnectUsdxWallet,
} = require('./walletConnection')

test('resets the visible connection state before an async connector finishes disconnecting', async () => {
  const events = []
  const connector = { id: 'injected' }
  let finishDisconnect
  const disconnectGate = new Promise((resolve) => {
    finishDisconnect = resolve
  })

  const disconnecting = disconnectUsdxWallet({
    connectors: [connector],
    currentConnector: connector,
    disconnectConnector: async (target) => {
      events.push(`disconnect:${target.id}:start`)
      await disconnectGate
      events.push(`disconnect:${target.id}:end`)
    },
    markManualLogout: () => events.push('manual-logout'),
    resetConnectionState: () => events.push('reset'),
    clearPersistedState: async () => events.push('clear-persisted'),
    setDisconnecting: (value) => events.push(`disconnecting:${value}`),
  })

  await Promise.resolve()
  assert.deepEqual(events, [
    'disconnecting:true',
    'manual-logout',
    'reset',
    'disconnect:injected:start',
  ])

  finishDisconnect()
  await disconnecting

  assert.deepEqual(events.slice(-4), [
    'disconnect:injected:end',
    'reset',
    'clear-persisted',
    'disconnecting:false',
  ])
})

test('attempts every unique connector and still cleans up when one disconnect fails', async () => {
  const first = { id: 'first' }
  const second = { id: 'second' }
  const disconnected = []
  let resetCount = 0
  let clearCount = 0

  await disconnectUsdxWallet({
    connectors: [first, second],
    currentConnector: first,
    disconnectConnector: async (connector) => {
      disconnected.push(connector)
      if (connector === first) throw new Error('provider disconnect failed')
    },
    markManualLogout: () => undefined,
    resetConnectionState: () => {
      resetCount += 1
    },
    clearPersistedState: async () => {
      clearCount += 1
    },
    setDisconnecting: () => undefined,
  })

  assert.deepEqual(disconnected, [first, second])
  assert.equal(resetCount, 2)
  assert.equal(clearCount, 1)
})

test('disconnects the current connector snapshot when the active connector list is empty', async () => {
  const currentConnector = { id: 'current' }
  const disconnected = []

  await disconnectUsdxWallet({
    connectors: [],
    currentConnector,
    disconnectConnector: async (connector) => disconnected.push(connector),
    markManualLogout: () => undefined,
    resetConnectionState: () => undefined,
    clearPersistedState: async () => undefined,
    setDisconnecting: () => undefined,
  })

  assert.deepEqual(disconnected, [currentConnector])
})

test('clears manual logout only after an explicit connection succeeds', async () => {
  const events = []

  const result = await connectUsdxWalletExplicitly({
    connect: async () => {
      events.push('connect')
      return 'connected'
    },
    clearManualLogout: () => events.push('clear-manual-logout'),
    markManualLogout: () => events.push('mark-manual-logout'),
  })

  assert.equal(result, 'connected')
  assert.deepEqual(events, ['connect', 'clear-manual-logout'])
})

test('restores manual logout and rethrows when an explicit connection fails', async () => {
  const expectedError = new Error('connection rejected')
  let marked = false
  let cleared = false

  await assert.rejects(
    connectUsdxWalletExplicitly({
      connect: async () => {
        throw expectedError
      },
      clearManualLogout: () => {
        cleared = true
      },
      markManualLogout: () => {
        marked = true
      },
    }),
    expectedError
  )

  assert.equal(marked, true)
  assert.equal(cleared, false)
})
