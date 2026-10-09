import { useCallback, useRef, useState } from 'react'
import { getWalletClient } from '@wagmi/core'
import {
  useAccount,
  useConfig,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { usdxTokenAbi } from '@/abis/usdx/usdxTokenAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { parseTokenAmount } from '@/utils/usdx/amounts'
import {
  buildEip2612Domain,
  EIP2612_PERMIT_TYPES,
  splitEip2612Signature,
} from '@/utils/usdx/erc20Permit2612'
import { ensureUsdxWalletChain, resolveUsdxWalletClient } from '@/utils/usdx/ensureUsdxChain'
import { permit2Deadline } from '@/utils/usdx/permit2Constants'
import { isUserRejectedWalletError } from '@/utils/walletErrors'

export const useUsdxRedeemQuote = (amount: bigint) => {
  const usdx = useUsdxConfig()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const chainId = usdx?.chainId
  const enabled = Boolean(diamond && chainId && amount > 0n)

  const query = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'quoteRedeem',
    args: [amount],
    chainId,
    query: { enabled, retry: 2, refetchOnMount: 'always' },
  })

  return {
    quote: query.data,
    loading:
      query.isLoading || query.isPending || (query.isFetching && query.data == null),
    error: query.error,
  }
}

export const useUsdxRedeemAction = () => {
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

  const targetChainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const usdxToken = usdx?.usdx as `0x${string}` | undefined

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const redeem = useCallback(
    async (amountRaw: string) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setSubmitting(true)
      setError(null)
      resetWrite()

      try {
        if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
        if (!diamond || !usdxToken || !publicClient || !walletClient || targetChainId == null) {
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
        const deadline = permit2Deadline()

        const [tokenName, nonce] = await Promise.all([
          publicClient.readContract({
            address: usdxToken,
            abi: usdxTokenAbi,
            functionName: 'name',
          }),
          publicClient.readContract({
            address: usdxToken,
            abi: usdxTokenAbi,
            functionName: 'nonces',
            args: [address],
          }),
        ])

        const signature = await signer.signTypedData({
          account: address as `0x${string}`,
          domain: buildEip2612Domain(tokenName, targetChainId, usdxToken),
          types: EIP2612_PERMIT_TYPES,
          primaryType: 'Permit',
          message: {
            owner: address,
            spender: diamond,
            value: amount,
            nonce,
            deadline,
          },
        })
        const { v, r, s } = splitEip2612Signature(signature)

        await writeContractAsync({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: 'redeem',
          args: [amount, { deadline, v, r, s }],
          chainId: targetChainId,
        })
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
        }
        throw e
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [
      address,
      diamond,
      isConnected,
      publicClient,
      resetWrite,
      switchChainAsync,
      targetChainId,
      usdxToken,
      wagmiConfig,
      walletClient,
      writeContractAsync,
    ]
  )

  return {
    redeem,
    submitting: submitting || confirming,
    txHash,
    isSuccess,
    error,
    resetWrite,
  }
}
