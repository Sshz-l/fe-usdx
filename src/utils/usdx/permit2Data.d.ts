export type TPermit2TokenPermissions = {
  token: `0x${string}`
  amount: bigint
}

export type TPermitTransferFrom = {
  permitted: TPermit2TokenPermissions
  nonce: bigint
  deadline: bigint
}

export type TPermitBatchTransferFrom = {
  permitted: TPermit2TokenPermissions[]
  nonce: bigint
  deadline: bigint
}

export type TPermitTransferMessage = TPermitTransferFrom & {
  spender: `0x${string}`
}

export type TPermitBatchTransferMessage = TPermitBatchTransferFrom & {
  spender: `0x${string}`
}

export const PERMIT2_TRANSFER_TYPES: {
  readonly PermitTransferFrom: readonly [
    { readonly name: 'permitted'; readonly type: 'TokenPermissions' },
    { readonly name: 'spender'; readonly type: 'address' },
    { readonly name: 'nonce'; readonly type: 'uint256' },
    { readonly name: 'deadline'; readonly type: 'uint256' }
  ]
  readonly TokenPermissions: readonly [
    { readonly name: 'token'; readonly type: 'address' },
    { readonly name: 'amount'; readonly type: 'uint256' }
  ]
}

export const PERMIT2_BATCH_TYPES: {
  readonly PermitBatchTransferFrom: readonly [
    { readonly name: 'permitted'; readonly type: 'TokenPermissions[]' },
    { readonly name: 'spender'; readonly type: 'address' },
    { readonly name: 'nonce'; readonly type: 'uint256' },
    { readonly name: 'deadline'; readonly type: 'uint256' }
  ]
  readonly TokenPermissions: readonly [
    { readonly name: 'token'; readonly type: 'address' },
    { readonly name: 'amount'; readonly type: 'uint256' }
  ]
}

export function buildPermitTransferMessage(
  permit: TPermitTransferFrom,
  spender: `0x${string}`
): TPermitTransferMessage

export function buildPermitBatchTransferMessage(
  permit: TPermitBatchTransferFrom,
  spender: `0x${string}`
): TPermitBatchTransferMessage

export function toContractPermit(message: TPermitTransferMessage): TPermitTransferFrom
export function toContractPermit(message: TPermitBatchTransferMessage): TPermitBatchTransferFrom
