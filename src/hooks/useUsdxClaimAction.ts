import { useCallback, useState } from 'react'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { isUserRejectedWalletError } from '@/utils/walletErrors'

export const useUsdxClaimAction = () => {
  const usdx = useUsdxConfig()
  const { address, isConnected, chainId } = useAccount()
  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const targetChainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const run = useCallback(
    async (write: () => Promise<unknown>) => {
      setError(null)
      resetWrite()
      if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
      if (!targetChainId || chainId !== targetChainId) {
        throw new Error(t`Please switch to BNB Smart Chain`)
      }
      if (!diamond) throw new Error(t`USDX config missing`)
      setSubmitting(true)
      try {
        await write()
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
        }
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [address, chainId, diamond, isConnected, resetWrite, targetChainId]
  )

  const releaseAll = useCallback(async () => {
    if (!diamond || !targetChainId) throw new Error(t`USDX config missing`)
    await run(() =>
      writeContractAsync({
        address: diamond,
        abi: usdxDiamondAbi,
        functionName: 'releaseAll',
        chainId: targetChainId,
      })
    )
  }, [diamond, run, targetChainId, writeContractAsync])

  const releaseOne = useCallback(
    async (mintId: bigint) => {
      if (!diamond || !targetChainId) throw new Error(t`USDX config missing`)
      await run(() =>
        writeContractAsync({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: 'release',
          args: [mintId],
          chainId: targetChainId,
        })
      )
    },
    [diamond, run, targetChainId, writeContractAsync]
  )

  return {
    releaseAll,
    releaseOne,
    submitting: submitting || confirming,
    txHash,
    isSuccess,
    error,
    resetWrite,
  }
}
