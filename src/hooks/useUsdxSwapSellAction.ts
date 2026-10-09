import { useCallback, useRef, useState } from 'react'
import { getWalletClient } from '@wagmi/core'
import {
  useAccount,
  useConfig,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { parseTokenAmount } from '@/utils/usdx/amounts'
import { ensureErc20Permit2Allowance } from '@/utils/usdx/erc20Permit2'
import { ensureUsdxWalletChain, resolveUsdxWalletClient } from '@/utils/usdx/ensureUsdxChain'
import {
  buildPermit2Domain,
  buildPermitTransferMessage,
  PERMIT2_TRANSFER_TYPES,
  permit2Deadline,
  randomPermit2Nonce,
  toContractPermit,
  type TPermitTransferFrom,
  type TPermitTransferMessage,
} from '@/utils/usdx/permit2Constants'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { resolveSellWriteName } from '@/utils/usdx/orderViews'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'

export const useUsdxSwapSellAction = () => {
  const usdx = useUsdxConfig()
  const wagmiConfig = useConfig()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: usdx?.chainId })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<bigint | null>(null)

  const targetChainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const permit2 = usdx?.permit2 as `0x${string}` | undefined
  const usdxToken = usdx?.usdx as `0x${string}` | undefined

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const buildUsdxPermit = useCallback(
    (amount: bigint): TPermitTransferFrom => {
      if (!usdxToken) throw new Error(t`USDX config missing`)
      return {
        permitted: { token: usdxToken, amount },
        nonce: randomPermit2Nonce(),
        deadline: permit2Deadline(),
      }
    },
    [usdxToken]
  )

  const signUsdxPermit = useCallback(
    async (
      permit: TPermitTransferMessage,
      client: NonNullable<typeof walletClient>,
      account: `0x${string}`
    ) => {
      if (!targetChainId || !permit2) throw new Error(t`Wallet or config unavailable`)
      return client.signTypedData({
        account,
        domain: buildPermit2Domain(targetChainId, permit2),
        types: PERMIT2_TRANSFER_TYPES,
        primaryType: 'PermitTransferFrom',
        message: permit,
      })
    },
    [permit2, targetChainId]
  )

  const sellUsdx = useCallback(
    async (amountRaw: string, options?: { instant?: boolean }) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setSubmitting(true)
      setError(null)
      setOrderId(null)
      resetWrite()

      try {
        if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
        if (!diamond || !permit2 || !usdxToken || !publicClient || !walletClient || targetChainId == null) {
          throw new Error(t`USDX config or client unavailable`)
        }
        await ensureUsdxWalletChain({
          targetChainId,
          walletClient,
          switchChainAsync,
          missingMessage: t`USDX config or client unavailable`,
          switchMessage: t`Please switch to BNB Smart Chain`,
        })
        const signer = (await resolveUsdxWalletClient({
          config: wagmiConfig,
          targetChainId,
          getWalletClient,
          switchMessage: t`Please switch to BNB Smart Chain`,
        })) as NonNullable<typeof walletClient>

        const parsedAmount = parseTokenAmount(amountRaw)
        if (!parsedAmount.ok || parsedAmount.amount <= 0n) {
          throw new Error(t`Enter a valid amount`)
        }
        const amount = parsedAmount.amount
        const permit = buildPermitTransferMessage(buildUsdxPermit(amount), diamond)
        const writeName = resolveSellWriteName(options?.instant) as 'sell' | 'sellInstant'

        await ensureErc20Permit2Allowance({
          publicClient,
          walletClient: signer,
          token: usdxToken,
          owner: address as `0x${string}`,
          permit2,
        })
        const signature = await signUsdxPermit(permit, signer, address as `0x${string}`)
        // publicClient 已按 USDX chainId 创建；勿再传 walletClient.chain（部分钱包 chain 为空会导致 simulate 误失败）
        const { result } = await publicClient.simulateContract({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: writeName,
          args: [amount, toContractPermit(permit), signature],
          account: address,
        })
        await writeContractAsync({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: writeName,
          args: [amount, toContractPermit(permit), signature],
          chainId: targetChainId,
        })
        // sellInstant 无返回值；用 0n 标记即时成交（与 isSellInstantFill / shouldRefreshActiveSellOrders 对齐）
        setOrderId(writeName === 'sellInstant' ? 0n : BigInt(result as bigint | number))
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          setError(getUsdxWriteErrorMessage(e, t`Failed to submit swap, please try again`))
        }
        throw e
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [
      address,
      buildUsdxPermit,
      diamond,
      isConnected,
      permit2,
      publicClient,
      resetWrite,
      signUsdxPermit,
      switchChainAsync,
      targetChainId,
      usdxToken,
      wagmiConfig,
      walletClient,
      writeContractAsync,
    ]
  )

  return {
    sellUsdx,
    submitting: submitting || confirming,
    txHash,
    isSuccess,
    orderId,
    error,
    resetWrite,
  }
}
