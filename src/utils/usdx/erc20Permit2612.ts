import { parseSignature, type Hex } from 'viem'

/** USDX 代币 EIP-2612 Permit（redeem 路径；非 Permit2） */
export const EIP2612_PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

export const buildEip2612Domain = (
  name: string,
  chainId: number,
  token: `0x${string}`,
  version = '1'
) => ({
  name,
  version,
  chainId,
  verifyingContract: token,
})

export const splitEip2612Signature = (signature: Hex) => {
  const { r, s, v } = parseSignature(signature)
  if (v == null) throw new Error('签名缺少 v')
  return {
    r,
    s,
    v: Number(v),
  }
}
