import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import {
  aggregatePositions,
  chunkMintIds,
  POSITION_BATCH_SIZE,
  resolveDepositD,
} from '@/utils/usdx/positionViews'

type TPosition = {
  mintId: bigint
  totalUSDX: bigint
  payUSDT: bigint
  payBOX: bigint
  immediate: bigint
  /** 兼容展示：D = 2·payUSDT */
  depositD: bigint
  startTs: bigint
  claimed: bigint
  lockL0: bigint
  elapsed: bigint
  vested: bigint
  claimableAmount: bigint
  remainingLock: bigint
  daily: bigint
}

const asPosition = (raw: TPosition | readonly unknown[]): TPosition => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'mintId' in raw) {
    const row = raw as TPosition & { depositD?: bigint }
    const totalUSDX = BigInt(row.totalUSDX ?? 0)
    const payUSDT = BigInt(row.payUSDT ?? 0)
    const payBOX = BigInt(row.payBOX ?? 0)
    const immediate = BigInt(row.immediate ?? 0)
    const normalized = {
      ...row,
      mintId: BigInt(row.mintId),
      totalUSDX,
      payUSDT,
      payBOX,
      immediate,
      startTs: BigInt(row.startTs ?? 0),
      claimed: BigInt(row.claimed ?? 0),
      lockL0: BigInt(row.lockL0 ?? 0),
      elapsed: BigInt(row.elapsed ?? 0),
      vested: BigInt(row.vested ?? 0),
      claimableAmount: BigInt(row.claimableAmount ?? 0),
      remainingLock: BigInt(row.remainingLock ?? 0),
      daily: BigInt(row.daily ?? 0),
    }
    return {
      ...normalized,
      depositD: resolveDepositD(normalized),
    }
  }
  const row = raw as readonly bigint[]
  // wiki positionOf: mintId,totalUSDX,payUSDT,payBOX,immediate,startTs,claimed,lockL0,elapsed,vested,claimableAmount,remainingLock,daily
  const normalized = {
    mintId: BigInt(row[0]),
    totalUSDX: BigInt(row[1]),
    payUSDT: BigInt(row[2]),
    payBOX: BigInt(row[3]),
    immediate: BigInt(row[4]),
    startTs: BigInt(row[5]),
    claimed: BigInt(row[6]),
    lockL0: BigInt(row[7]),
    elapsed: BigInt(row[8]),
    vested: BigInt(row[9]),
    claimableAmount: BigInt(row[10]),
    remainingLock: BigInt(row[11]),
    daily: BigInt(row[12]),
  }
  return {
    ...normalized,
    depositD: resolveDepositD(normalized),
  }
}

export const useUsdxPositions = () => {
  const usdx = useUsdxConfig()
  const { address, chainId } = useAccount()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const targetChainId = usdx?.chainId
  const publicClient = usePublicClient({ chainId: targetChainId })
  const [positions, setPositions] = useState<TPosition[]>([])
  const [aggregate, setAggregate] = useState<ReturnType<typeof aggregatePositions>>(null)
  const [loading, setLoading] = useState(false)
  const [aggregateLoading, setAggregateLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [visibleCount, setVisibleCount] = useState(POSITION_BATCH_SIZE)
  const generationRef = useRef(0)

  const requestKey = `${targetChainId || ''}:${diamond || ''}:${address || ''}:${chainId || ''}`

  const refetch = useCallback(async (options?: { keepStale?: boolean }) => {
    const keepStale = options?.keepStale ?? false
    const generation = ++generationRef.current
    const isCurrent = () => generationRef.current === generation
    if (!keepStale) {
      setPositions([])
      setAggregate(null)
      setVisibleCount(POSITION_BATCH_SIZE)
    }
    setError(null)
    if (!publicClient || !address || !diamond) {
      setLoading(false)
      setAggregateLoading(false)
      return
    }

    setLoading(!keepStale)
    setAggregateLoading(true)
    try {
      const ids = await publicClient.readContract({
        address: diamond,
        abi: usdxDiamondAbi,
        functionName: 'mintIdsOf',
        args: [address],
      })
      if (!isCurrent()) return
      const batches = chunkMintIds(ids, POSITION_BATCH_SIZE)
      const collected: TPosition[] = []
      let failed = false
      for (const batch of batches) {
        const result = await publicClient.multicall({
          contracts: batch.map((mintId) => ({
            address: diamond,
            abi: usdxDiamondAbi,
            functionName: 'positionOf' as const,
            args: [mintId] as const,
          })),
          allowFailure: true,
        })
        if (!isCurrent()) return
        if (result.some((item) => item.status === 'failure')) {
          failed = true
          break
        }
        collected.push(
          ...result.map((item) => asPosition(item.result as TPosition | readonly unknown[]))
        )
        setPositions([...collected])
        setLoading(false)
      }
      if (!isCurrent()) return
      if (failed) {
        setAggregate(null)
        setError(new Error(t`Position read failed`))
        setAggregateLoading(false)
        setLoading(false)
        return
      }
      setAggregate(aggregatePositions(collected))
      setAggregateLoading(false)
      setLoading(false)
    } catch (readError: unknown) {
      if (!isCurrent()) return
      setAggregate(null)
      setError(readError instanceof Error ? readError : new Error(t`Position read failed`))
      setLoading(false)
      setAggregateLoading(false)
    }
  }, [address, diamond, publicClient])

  useEffect(() => {
    void refetch()
    return () => {
      generationRef.current += 1
    }
  }, [refetch, requestKey])

  const list = useMemo(() => positions.slice(0, visibleCount), [positions, visibleCount])
  const hasMore = visibleCount < positions.length || (aggregateLoading && positions.length > 0)

  return {
    list,
    positions,
    aggregate,
    loading,
    aggregateLoading,
    error,
    hasMore,
    loadMore: () => setVisibleCount((count) => count + POSITION_BATCH_SIZE),
    refetch,
  }
}
