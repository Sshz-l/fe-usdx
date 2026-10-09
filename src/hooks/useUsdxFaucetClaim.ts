import { useCallback, useState } from 'react'
import getConfig from 'next/config'
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { t } from '@lingui/macro'

import { faucetErc20Abi } from '@/abis/usdx/faucetErc20Abi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import {
  USDX_FAUCET_CLAIM_BOX,
  USDX_FAUCET_CLAIM_USDT,
  shouldShowUsdxFaucet,
} from '@/utils/usdx/faucetViews'
import { waitForUsdxTxSuccess } from '@/utils/usdx/txReceipt'
import { isUserRejectedWalletError } from '@/utils/walletErrors'

const { publicRuntimeConfig } = getConfig()

export type TUsdxFaucetClaimStep = 'idle' | 'usdt' | 'box'

export const useUsdxFaucetClaim = () => {
  const usdx = useUsdxConfig()
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: usdx?.chainId })
  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract()
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<TUsdxFaucetClaimStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const targetChainId = usdx?.chainId
  const tusdt = usdx?.usdt as `0x${string}` | undefined
  const tbox = usdx?.box as `0x${string}` | undefined

  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const claimToken = useCallback(
    async (token: `0x${string}`, amount: bigint) => {
      if (!publicClient) throw new Error(t`On-chain client unavailable`)
      const hash = await writeContractAsync({
        address: token,
        abi: faucetErc20Abi,
        functionName: 'claim',
        args: [amount],
        chainId: targetChainId,
      })
      await waitForUsdxTxSuccess(publicClient, hash)
      return hash
    },
    [publicClient, targetChainId, writeContractAsync]
  )

  const claimAll = useCallback(async () => {
    setError(null)
    resetWrite()

    if (!shouldShowUsdxFaucet(publicRuntimeConfig)) {
      throw new Error(t`Faucet is unavailable in this environment`)
    }
    if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
    if (!targetChainId || chainId !== targetChainId) {
      throw new Error(t`Please switch to BNB Smart Chain`)
    }
    if (!tusdt || !tbox) throw new Error(t`USDX config missing`)

    setSubmitting(true)
    try {
      setStep('usdt')
      await claimToken(tusdt, USDX_FAUCET_CLAIM_USDT)
      setStep('box')
      await claimToken(tbox, USDX_FAUCET_CLAIM_BOX)
      setStep('idle')
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = e instanceof Error ? e.message : t`Failed to claim test tokens, please try again`
        setError(msg)
      }
      setStep('idle')
      throw e
    } finally {
      setSubmitting(false)
    }
  }, [
    address,
    chainId,
    claimToken,
    isConnected,
    resetWrite,
    targetChainId,
    tbox,
    tusdt,
  ])

  return {
    claimAll,
    submitting: submitting || confirming,
    step,
    error,
    resetWrite,
  }
}
