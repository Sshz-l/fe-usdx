/** @typedef {{ token: `0x${string}`, amount: bigint }} TTokenPermissions */
/**
 * @typedef {{ permitted: TTokenPermissions, nonce: bigint, deadline: bigint }} TContractPermitTransfer
 */
/**
 * @typedef {{ permitted: TTokenPermissions[], nonce: bigint, deadline: bigint }} TContractPermitBatchTransfer
 */
/** @typedef {TContractPermitTransfer & { spender: `0x${string}` }} TPermitTransferMessage */
/** @typedef {TContractPermitBatchTransfer & { spender: `0x${string}` }} TPermitBatchTransferMessage */

const PERMIT2_TRANSFER_TYPES = /** @type {const} */ ({
  PermitTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
})

const PERMIT2_BATCH_TYPES = /** @type {const} */ ({
  PermitBatchTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions[]' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
})

/**
 * @param {TContractPermitTransfer} permit
 * @param {`0x${string}`} spender
 * @returns {TPermitTransferMessage}
 */
const buildPermitTransferMessage = (permit, spender) => ({ ...permit, spender })

/**
 * @param {TContractPermitBatchTransfer} permit
 * @param {`0x${string}`} spender
 * @returns {TPermitBatchTransferMessage}
 */
const buildPermitBatchTransferMessage = (permit, spender) => ({ ...permit, spender })

/**
 * Remove the EIP-712-only spender before passing a permit to the Diamond ABI.
 * @template {TPermitTransferMessage | TPermitBatchTransferMessage} T
 * @param {T} message
 * @returns {Omit<T, 'spender'>}
 */
const toContractPermit = (message) => {
  const { spender: _spender, ...permit } = message
  return permit
}

module.exports = {
  PERMIT2_BATCH_TYPES,
  PERMIT2_TRANSFER_TYPES,
  buildPermitBatchTransferMessage,
  buildPermitTransferMessage,
  toContractPermit,
}
