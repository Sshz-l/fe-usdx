import { erc20Abi, maxUint256, type PublicClient, type WalletClient } from 'viem'

import { waitForUsdxTxSuccess } from '@/utils/usdx/txReceipt'

export const MIN_PERMIT2_ALLOWANCE = maxUint256 / 2n

export const isPermit2AllowanceReady = (allowance: bigint) => allowance >= MIN_PERMIT2_ALLOWANCE

export const readErc20Allowance = async (
  client: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
) =>
  client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  })

export const hasErc20Permit2Allowance = async ({
  publicClient,
  token,
  owner,
  permit2,
}: {
  publicClient: PublicClient
  token: `0x${string}`
  owner: `0x${string}`
  permit2: `0x${string}`
}) => {
  const allowance = await readErc20Allowance(publicClient, token, owner, permit2)
  return isPermit2AllowanceReady(allowance)
}

/** 确保 token 已对 Permit2 授权（一次性 max） */
export const ensureErc20Permit2Allowance = async ({
  publicClient,
  walletClient,
  token,
  owner,
  permit2,
}: {
  publicClient: PublicClient
  walletClient: WalletClient
  token: `0x${string}`
  owner: `0x${string}`
  permit2: `0x${string}`
}) => {
  const allowance = await readErc20Allowance(publicClient, token, owner, permit2)
  if (isPermit2AllowanceReady(allowance)) return

  const hash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [permit2, maxUint256],
    account: owner,
    chain: walletClient.chain,
  })
  await waitForUsdxTxSuccess(publicClient, hash)
}
