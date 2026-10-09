import { useCallback, useRef, useState } from 'react'
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { formatUsdxAmount } from '@/utils/usdx/homeViews'
import { SWAP_RECV_DISPLAY_DP } from '@/utils/usdx/swapQuote'
import { isUserRejectedWalletError } from '@/utils/walletErrors'

export const useUsdxClaimSellerAction = () => {
  const usdx = useUsdxConfig()
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: usdx?.chainId })
  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract()
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastNetRef = useRef<bigint | null>(null)
  const targetChainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const resolveClaimSuccessMessage = useCallback(() => {
    const net = lastNetRef.current
    if (net == null) return t`USDT claimed`
    const label = formatUsdxAmount(net, SWAP_RECV_DISPLAY_DP)
    return t`USDT claimed ${label}`
  }, [])

  const claimSellerUsdt = useCallback(
    async (orderId: bigint) => {
      setError(null)
      resetWrite()
      if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
      if (!targetChainId || chainId !== targetChainId) {
        throw new Error(t`Please switch to BNB Smart Chain`)
      }
      if (!diamond || !publicClient) throw new Error(t`USDX config missing`)

      const id = orderId.toString()
      setSubmittingId(id)
      try {
        const [, grossClaimable] = await publicClient.readContract({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: 'quoteOrder',
          args: [Number(orderId)],
        })
        lastNetRef.current = grossClaimable
        await writeContractAsync({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: 'claimSellerUSDT',
          args: [Number(orderId)],
          chainId: targetChainId,
        })
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
        }
        throw e
      } finally {
        setSubmittingId(null)
      }
    },
    [address, chainId, diamond, isConnected, publicClient, resetWrite, targetChainId, writeContractAsync]
  )

  return {
    claimSellerUsdt,
    resolveClaimSuccessMessage,
    submittingId,
    submitting: Boolean(submittingId) || confirming,
    txHash,
    isSuccess,
    error,
    resetWrite,
  }
}
