const test = require('node:test')
const assert = require('node:assert/strict')

const {
  isBrokenConnectorError,
  isBrokenConnectorGlobalError,
} = require('./wagmiConnectorGuard')

test('isBrokenConnectorError matches connector method + is not a function', () => {
  assert.equal(isBrokenConnectorError('connector.getChainId is not a function'), true)
  assert.equal(isBrokenConnectorError('getProvider is not a function'), true)
  assert.equal(isBrokenConnectorError('getAccounts is not a function'), true)
})

test('isBrokenConnectorError rejects unrelated global errors', () => {
  assert.equal(isBrokenConnectorError('render is not a function'), false)
  assert.equal(isBrokenConnectorError('failed to getAccounts from cache'), false)
  assert.equal(isBrokenConnectorError('getChainId request failed'), false)
  assert.equal(isBrokenConnectorError(undefined), false)
})

test('isBrokenConnectorGlobalError accepts wagmi stack with connector method in message', () => {
  const stack = 'Error\n    at reconnect (@wagmi/core/dist/esm/actions/reconnect.js:12:3)'
  assert.equal(
    isBrokenConnectorGlobalError("Cannot read properties of undefined (reading 'getChainId')", stack),
    true
  )
})

test('isBrokenConnectorGlobalError rejects connector method without wagmi stack', () => {
  assert.equal(isBrokenConnectorGlobalError('getChainId request failed', 'Error\n    at app.js:1:1'), false)
})

test('isBrokenConnectorGlobalError rejects unrelated errors even with wagmi stack', () => {
  const stack = 'Error\n    at foo (@wagmi/core/dist/esm/actions/reconnect.js:12:3)'
  assert.equal(isBrokenConnectorGlobalError('network timeout', stack), false)
})
