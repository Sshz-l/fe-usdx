const test = require('node:test')
const assert = require('node:assert/strict')
const { encodeErrorResult, parseAbiItem } = require('viem')

const {
  decodeUsdxStabilizerErrorData,
  getUsdxStabilizerErrorMessage,
} = require('./stabilizerErrors')

const QUEUE_MATCH_ERROR_DATA =
  '0xb5501735' +
  '00000000000000000000000000000000000000000000000002c68af0bb140000' +
  '000000000000000000000000000000000000000000000000002386f26fc10000'

test('decodes 0xb5501735 queue amount and requested amount', () => {
  assert.deepEqual(decodeUsdxStabilizerErrorData(QUEUE_MATCH_ERROR_DATA), {
    code: 'queue-order-mismatch',
    queueAmount: 200000000000000000n,
    requestedAmount: 10000000000000000n,
  })
})

test('returns a Chinese queue matching message from nested viem revert data', () => {
  const error = {
    message: 'The contract function reverted.',
    cause: {
      data: QUEUE_MATCH_ERROR_DATA,
    },
  }

  assert.equal(
    getUsdxStabilizerErrorMessage(error),
    'Queue head is 0.20 USDX; this swap of 0.01 USDT cannot fill a whole order. Use the queue-head amount.'
  )
})

test('returns a generic Chinese message when viem only exposes the selector', () => {
  const error = new Error(
    'The contract function reverted with the following signature: 0xb5501735'
  )

  assert.equal(
    getUsdxStabilizerErrorMessage(error),
    'This amount cannot fill a whole queue order. Refresh and retry with the latest amount.'
  )
})

test('does not replace unrelated errors', () => {
  assert.equal(getUsdxStabilizerErrorMessage(new Error('network unavailable')), null)
})

test('maps known sell/permit revert selectors to Chinese copy', () => {
  assert.equal(
    getUsdxStabilizerErrorMessage(
      new Error('The contract function reverted with the following signature: 0x8baa579f')
    ),
    'Invalid signature, please retry the swap'
  )
  assert.equal(
    getUsdxStabilizerErrorMessage({
      shortMessage: 'Stabilizer paused',
      message: 'reverted with 0xfab98a49',
    }),
    'Stabilizer paused, swap unavailable'
  )
})

test('maps mint price slippage check to a short retry message', () => {
  assert.equal(
    getUsdxStabilizerErrorMessage({
      shortMessage:
        'The contract function "mint" reverted with the following reason: Price slippage check',
    }),
    'BOX price changed. Sign again to mint with the latest quote.'
  )
})

test('maps LP minimum liquidity shortfall to the same re-sign message', () => {
  assert.equal(
    getUsdxStabilizerErrorMessage({
      shortMessage:
        'The contract function "mintWithMinLpLiquidity" reverted.\nError: MinLpLiquidityNotMet(uint128 actual, uint128 minimum)',
    }),
    'BOX price changed. Sign again to mint with the latest quote.'
  )
  assert.equal(
    getUsdxStabilizerErrorMessage({
      message: `execution reverted: ${encodeErrorResult({
        abi: [parseAbiItem('error MinLpLiquidityNotMet(uint128 actual, uint128 minimum)')],
        errorName: 'MinLpLiquidityNotMet',
        args: [1n, 2n],
      })}`,
    }),
    'BOX price changed. Sign again to mint with the latest quote.'
  )
})

test('getUsdxWriteErrorMessage prefers stabilizer decode then shortMessage', () => {
  const { getUsdxWriteErrorMessage } = require('./stabilizerErrors')
  assert.equal(
    getUsdxWriteErrorMessage(
      { shortMessage: 'RPC timed out', message: 'long dump\nmore' },
      'fallback'
    ),
    'RPC timed out'
  )
  assert.equal(
    getUsdxWriteErrorMessage(
      new Error('The contract function reverted with the following signature: 0x8baa579f'),
      'fallback'
    ),
    'Invalid signature, please retry the swap'
  )
  assert.equal(getUsdxWriteErrorMessage(null, 'fallback'), 'fallback')
})

test('maps DeBox provider request timeout wrapped by viem to a retry message', () => {
  const { ResourceUnavailableRpcError, TransactionExecutionError } = require('viem')
  const { getUsdxWriteErrorMessage } = require('./stabilizerErrors')
  const providerError = Object.assign(new Error('Request timeout'), { code: -32002 })
  const error = new TransactionExecutionError(new ResourceUnavailableRpcError(providerError), {
    account: { address: '0x0000000000000000000000000000000000000001' },
  })
  assert.equal(error.shortMessage, 'Requested resource not available.')
  assert.equal(getUsdxWriteErrorMessage(error, 'fallback'), 'Request timed out, please retry')
})
