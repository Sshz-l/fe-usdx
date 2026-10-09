import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import {
  appendOrderPage,
  asSellOrderView,
  createOrderPagination,
  getCancelSellSuccessMessage,
  getSellOrderStatus,
  ORDER_PAGE_SIZE,
} from '@/utils/usdx/orderViews'
import { isUserRejectedWalletError } from '@/utils/walletErrors'

type TOrderRaw = {
  orderId: bigint
  user: `0x${string}`
  amount: bigint
  remaining: bigint
  createAt: bigint
  start: bigint
  status: number
}

const normalizeOrderPage = (page: readonly unknown[]) =>
  page
    .map((item) => asSellOrderView(item))
    .filter((item): item is TOrderRaw => item != null)

type TOrderPagination = {
  items: TOrderRaw[]
  loadedRaw: bigint
  total: bigint
  hasMore: boolean
}

const emptyPagination = () => createOrderPagination() as TOrderPagination

export const useUsdxSellOrders = () => {
  const usdx = useUsdxConfig()
  const { address } = useAccount()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const chainId = usdx?.chainId
  const publicClient = usePublicClient({ chainId })
  const [pagination, setPagination] = useState<TOrderPagination>(emptyPagination)
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const generationRef = useRef(0)

  const refetch = useCallback(async () => {
    const generation = ++generationRef.current
    const initial = emptyPagination()
    setPagination(initial)
    paginationRef.current = initial
    setError(null)
    if (!publicClient || !address || !diamond) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [list, total] = await publicClient.readContract({
        address: diamond,
        abi: usdxDiamondAbi,
        functionName: 'activeSellOrdersOf',
        args: [address, 0n, BigInt(ORDER_PAGE_SIZE)],
      })
      if (generationRef.current !== generation) return
      const next = appendOrderPage(initial, normalizeOrderPage(list), total) as TOrderPagination
      paginationRef.current = next
      setPagination(next)
    } catch (readError: unknown) {
      if (generationRef.current === generation) {
        setError(readError instanceof Error ? readError : new Error(t`Order read failed`))
      }
    } finally {
      if (generationRef.current === generation) setLoading(false)
    }
  }, [address, diamond, publicClient])

  useEffect(() => {
    void refetch()
    return () => {
      generationRef.current += 1
    }
  }, [refetch])

  const loadMore = useCallback(async () => {
    const current = paginationRef.current
    if (!publicClient || !address || !diamond || !current.hasMore || loadingMore) return
    const generation = generationRef.current
    setLoadingMore(true)
    try {
      const [list, total] = await publicClient.readContract({
        address: diamond,
        abi: usdxDiamondAbi,
        functionName: 'activeSellOrdersOf',
        args: [address, current.loadedRaw, BigInt(ORDER_PAGE_SIZE)],
      })
      if (generationRef.current !== generation) return
      const next = appendOrderPage(current, normalizeOrderPage(list), total) as TOrderPagination
      paginationRef.current = next
      setPagination(next)
    } catch (readError: unknown) {
      if (generationRef.current === generation) {
        setError(readError instanceof Error ? readError : new Error(t`Order read failed`))
      }
    } finally {
      if (generationRef.current === generation) setLoadingMore(false)
    }
  }, [address, diamond, loadingMore, publicClient])

  return {
    items: pagination.items,
    hasMore: pagination.hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    refetch,
  }
}

export const useUsdxCancelSellAction = () => {
  const usdx = useUsdxConfig()
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: usdx?.chainId })
  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract()
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastOrderIdRef = useRef<bigint | null>(null)
  const lastClaimFallbackRef = useRef(false)
  const targetChainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const resolveCancelOutcome = useCallback(async () => {
    if (lastClaimFallbackRef.current) {
      return getCancelSellSuccessMessage(null, { claimedUsdt: true })
    }
    const orderId = lastOrderIdRef.current
    if (!publicClient || !diamond || orderId == null) {
      return getCancelSellSuccessMessage(null)
    }
    try {
      const order = await publicClient.readContract({
        address: diamond,
        abi: usdxDiamondAbi,
        functionName: 'sellOrder',
        args: [Number(orderId)],
      })
      const status = getSellOrderStatus(asSellOrderView(order, orderId))
      return getCancelSellSuccessMessage(status)
    } catch {
      return getCancelSellSuccessMessage(null)
    }
  }, [diamond, publicClient])

  const cancelSell = useCallback(
    async (orderId: bigint) => {
      setError(null)
      resetWrite()
      if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
      if (!targetChainId || chainId !== targetChainId) {
        throw new Error(t`Please switch to BNB Smart Chain`)
      }
      if (!diamond) throw new Error(t`USDX config missing`)

      const id = orderId.toString()
      lastOrderIdRef.current = orderId
      lastClaimFallbackRef.current = false
      setSubmittingId(id)
      try {
        if (publicClient) {
          const order = await publicClient.readContract({
            address: diamond,
            abi: usdxDiamondAbi,
            functionName: 'sellOrder',
            args: [Number(orderId)],
          })
          const view = asSellOrderView(order, orderId)
          if (view && view.remaining === 0n) {
            const [, grossClaimable] = await publicClient.readContract({
              address: diamond,
              abi: usdxDiamondAbi,
              functionName: 'quoteOrder',
              args: [Number(orderId)],
            })
            lastClaimFallbackRef.current = grossClaimable > 0n
          }
        }
        await writeContractAsync({
          address: diamond,
          abi: usdxDiamondAbi,
          functionName: 'cancelSell',
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
    cancelSell,
    resolveCancelOutcome,
    submittingId,
    submitting: Boolean(submittingId) || confirming,
    txHash,
    isSuccess,
    error,
    resetWrite,
  }
}
