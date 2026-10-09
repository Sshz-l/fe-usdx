const test = require('node:test')
const assert = require('node:assert/strict')

const { assertUsdxTxSuccess, waitForUsdxTxSuccess } = require('./txReceipt')

test('assertUsdxTxSuccess returns the receipt when status is success', () => {
  const receipt = { status: 'success', transactionHash: '0xabc' }
  assert.equal(assertUsdxTxSuccess(receipt), receipt)
})

test('assertUsdxTxSuccess throws when the receipt reverted', () => {
  assert.throws(
    () => assertUsdxTxSuccess({ status: 'reverted' }),
    /Transaction failed/
  )
})

test('assertUsdxTxSuccess throws when the receipt is missing', () => {
  assert.throws(() => assertUsdxTxSuccess(null), /Transaction failed/)
})

test('waitForUsdxTxSuccess throws after a reverted on-chain receipt', async () => {
  const publicClient = {
    waitForTransactionReceipt: async ({ hash }) => {
      assert.equal(hash, '0xdead')
      return { status: 'reverted', transactionHash: hash }
    },
  }
  await assert.rejects(
    () => waitForUsdxTxSuccess(publicClient, '0xdead'),
    /Transaction failed/
  )
})

test('waitForUsdxTxSuccess returns a successful receipt', async () => {
  const receipt = { status: 'success', transactionHash: '0xok' }
  const publicClient = {
    waitForTransactionReceipt: async () => receipt,
  }
  assert.equal(await waitForUsdxTxSuccess(publicClient, '0xok'), receipt)
})
