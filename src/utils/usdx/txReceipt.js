const { usdxT } = require('./usdxI18n')

const USDX_TX_REVERTED_MESSAGE = 'Transaction failed'

const isUsdxTxSuccess = (receipt) => receipt?.status === 'success'

/**
 * viem waitForTransactionReceipt resolves reverted receipts without throwing.
 * Callers that treat resolve as success must check status explicitly.
 *
 * @param {{ status?: string } | null | undefined} receipt
 * @param {string} [message]
 * @returns {{ status?: string }}
 */
const assertUsdxTxSuccess = (receipt, message) => {
  if (isUsdxTxSuccess(receipt)) return receipt
  throw new Error(message || usdxT(USDX_TX_REVERTED_MESSAGE))
}

/**
 * @param {{ waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<{ status?: string }> }} publicClient
 * @param {`0x${string}`} hash
 * @param {string} [message]
 */
const waitForUsdxTxSuccess = async (publicClient, hash, message) => {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return assertUsdxTxSuccess(receipt, message)
}

module.exports = {
  USDX_TX_REVERTED_MESSAGE,
  assertUsdxTxSuccess,
  isUsdxTxSuccess,
  waitForUsdxTxSuccess,
}
