/** Uniswap Permit2 SignatureTransfer — EIP-712（mint / 稳定器买卖共用；redeem 改用代币 EIP-2612） */
export const PERMIT2_DOMAIN_NAME = 'Permit2'

export {
  PERMIT2_BATCH_TYPES,
  PERMIT2_TRANSFER_TYPES,
  buildPermitBatchTransferMessage,
  buildPermitTransferMessage,
  toContractPermit,
} from './permit2Data'
export type {
  TPermit2TokenPermissions,
  TPermitBatchTransferFrom,
  TPermitBatchTransferMessage,
  TPermitTransferFrom,
  TPermitTransferMessage,
} from './permit2Data'

/** 默认签名有效窗口（秒） */
export const PERMIT2_DEFAULT_DEADLINE_SEC = 30 * 60

export const buildPermit2Domain = (chainId: number, permit2: `0x${string}`) => ({
  name: PERMIT2_DOMAIN_NAME,
  chainId,
  verifyingContract: permit2,
})

export const randomPermit2Nonce = () => {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  let n = 0n
  for (const b of buf) n = (n << 8n) | BigInt(b)
  return n
}

export const permit2Deadline = (sec = PERMIT2_DEFAULT_DEADLINE_SEC) =>
  BigInt(Math.floor(Date.now() / 1000) + sec)

/** mint maxBoxIn 缓冲：默认 +1%（100 bps），覆盖报价到上链间 BOX TWAP 上浮；非 FeeLocker lpSlippage */
export const withBoxSlippage = (boxIn: bigint, bps = 100n) => boxIn + (boxIn * bps) / 10000n
