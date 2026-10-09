const test = require('node:test')
const assert = require('node:assert/strict')

const { isUserRejectedWalletError } = require('./walletErrors')

test('recognizes only explicit user-rejection messages', () => {
  assert.equal(isUserRejectedWalletError('User rejected the request.'), true)
  assert.equal(isUserRejectedWalletError('RPC request rejected'), false)
  assert.equal(isUserRejectedWalletError('Access denied'), false)
})

test('recognizes structured provider rejection errors before text', () => {
  assert.equal(isUserRejectedWalletError({ name: 'UserRejectedRequestError' }), true)
  assert.equal(
    isUserRejectedWalletError({ cause: { code: 4001, message: 'request rejected' } }),
    true
  )
  assert.equal(isUserRejectedWalletError({ cause: { name: 'UserRejectedRequestError' } }), true)
  assert.equal(isUserRejectedWalletError({ code: 5000, message: 'User rejected.' }), true)
})

test('does not hide non-rejection switch failures', () => {
  assert.equal(isUserRejectedWalletError('Switch network failed'), false)
  assert.equal(isUserRejectedWalletError(new Error('RPC unavailable')), false)
})

test('recognizes wallet request timeouts through the viem cause chain', () => {
  const { ResourceUnavailableRpcError } = require('viem')
  const { isWalletRequestTimeoutError } = require('./walletErrors')
  const wrapped = new ResourceUnavailableRpcError(
    Object.assign(new Error('Request timeout'), { code: -32002 })
  )
  assert.equal(isWalletRequestTimeoutError(wrapped), true)
  assert.equal(isWalletRequestTimeoutError({ cause: { message: 'Request timeout' } }), true)
  assert.equal(isWalletRequestTimeoutError('Request timed out, please retry'), true)
  assert.equal(isWalletRequestTimeoutError(new Error('User rejected the request.')), false)
  assert.equal(
    isWalletRequestTimeoutError(
      Object.assign(new Error('Request of type eth_requestAccounts already pending'), {
        code: -32002,
      })
    ),
    false
  )
})
