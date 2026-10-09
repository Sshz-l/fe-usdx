const test = require('node:test')
const assert = require('node:assert/strict')

const {
  PERMIT2_BATCH_TYPES,
  PERMIT2_TRANSFER_TYPES,
  buildPermitBatchTransferMessage,
  buildPermitTransferMessage,
  toContractPermit,
} = require('./permit2Data')

const diamond = '0x1111111111111111111111111111111111111111'
const token = '0x2222222222222222222222222222222222222222'

test('single Permit2 type includes spender in the official field order', () => {
  assert.deepEqual(PERMIT2_TRANSFER_TYPES.PermitTransferFrom, [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ])
})

test('batch Permit2 type includes spender in the official field order', () => {
  assert.deepEqual(PERMIT2_BATCH_TYPES.PermitBatchTransferFrom, [
    { name: 'permitted', type: 'TokenPermissions[]' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ])
})

test('buildPermitTransferMessage binds the signature to the Diamond spender', () => {
  const permit = { permitted: { token, amount: 2n }, nonce: 3n, deadline: 4n }

  assert.deepEqual(buildPermitTransferMessage(permit, diamond), {
    ...permit,
    spender: diamond,
  })
})

test('buildPermitBatchTransferMessage binds the signature to the Diamond spender', () => {
  const permit = { permitted: [{ token, amount: 2n }], nonce: 3n, deadline: 4n }

  assert.deepEqual(buildPermitBatchTransferMessage(permit, diamond), {
    ...permit,
    spender: diamond,
  })
})

test('toContractPermit strips spender and preserves the contract tuple', () => {
  const permit = { permitted: { token, amount: 2n }, nonce: 3n, deadline: 4n }
  const message = buildPermitTransferMessage(permit, diamond)

  assert.deepEqual(toContractPermit(message), permit)
})

test('toContractPermit strips spender from a batch and preserves its contract tuple', () => {
  const permit = { permitted: [{ token, amount: 2n }], nonce: 3n, deadline: 4n }
  const message = buildPermitBatchTransferMessage(permit, diamond)

  assert.deepEqual(toContractPermit(message), permit)
})
