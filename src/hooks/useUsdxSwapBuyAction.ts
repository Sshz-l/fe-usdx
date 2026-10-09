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
import { ensureErc20Permit2Allowance } from '@/utils/usdx/erc20Permit2'
import { ensureUsdxWalletChain, resolveUsdxWalletClient } from '@/utils/usdx/ensureUsdxChain'
import { parseTokenAmount } from '@/utils/usdx/amounts'
import {
  buildPermitTransferMessage,
  buildPermit2Domain,
  PERMIT2_TRANSFER_TYPES,
  permit2Deadline,
  randomPermit2Nonce,
  toContractPermit,
  type TPermitTransferFrom,
  type TPermitTransferMessage,
} from '@/utils/usdx/permit2Constants'
import { getUsdxStabilizerErrorMessage } from '@/utils/usdx/stabilizerErrors'
import { isUserRejectedWalletError } from '@/utils/walletErrors'

export const useUsdxSwapBuyAction = () => {
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
  const permit2 = usdx?.permit2 as `0x${string}` | undefined
  const usdt = usdx?.usdt as `0x${string}` | undefined

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const buildUsdtPermit = useCallback(
    (amount: bigint): TPermitTransferFrom => {
      if (!usdt) throw new Error(t`USDX config missing`)
      return {
        permitted: { token: usdt, amount },
        nonce: randomPermit2Nonce(),
        deadline: permit2Deadline(),
      }
    },
    [usdt]
  )

  const signUsdtPermit = useCallback(
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

  const buyUsdtToUsdx = useCallback(
    async (amountRaw: string) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setSubmitting(true)
      setError(null)
      resetWrite()

      try {
        if (!isConnected || !address) {
          throw new Error(t`Please connect your wallet`)
        }
        if (!diamond || !permit2 || !usdt || !publicClient || !walletClient || targetChainId == null) {
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
        const permit = buildPermitTransferMessage(buildUsdtPermit(amount), diamond)

        await ensureErc20Permit2Allowance({
          publicClient,
          walletClient: signer,
          token: usdt,
          owner: address as `0x${string}`,
          permit2,
        })

        const signature = await signUsdtPermit(permit, signer, address as `0x${string}`)

        await writeContractAsync({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: 'buyUSDX',
          args: [amount, toContractPermit(permit), signature],
          chainId: targetChainId,
        })
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(getUsdxStabilizerErrorMessage(e) ?? msg)
        }
        throw e
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [
      address,
      buildUsdtPermit,
      diamond,
      isConnected,
      permit2,
      publicClient,
      resetWrite,
      signUsdtPermit,
      switchChainAsync,
      targetChainId,
      usdt,
      wagmiConfig,
      walletClient,
      writeContractAsync,
    ]
  )

  return {
    buyUsdtToUsdx,
    submitting: submitting || confirming,
    txHash,
    isSuccess,
    error,
    resetWrite,
  }
}
