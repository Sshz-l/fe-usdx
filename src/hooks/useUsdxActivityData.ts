import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import getConfig from 'next/config'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useAccount, usePublicClient } from 'wagmi'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { resolveUsdxConfig } from '@/constants/usdxConfig'
import { mapActivities, normalizeActivityRaw } from '@/utils/usdx/activityViews'
import {
  ACTIVITY_PAGE_SIZE,
  appendActivityPage,
  createActivityPagination,
  filterActivityItems,
  getActivityOffset,
  getActivityReadPrerequisiteError,
  getActivityRequestKey,
} from '@/utils/usdx/activityPagination'

const { publicRuntimeConfig } = getConfig()

type TActivityFilter = 'all' | 'mint' | 'redeem' | 'claim' | 'swap'

type TActivityRaw = {
  readonly kind: number
  readonly extra: number
  readonly ts: bigint
  readonly mintId: bigint
  readonly a0: bigint
  readonly a1: bigint
  readonly a2: bigint
}

type TActivityPagination = {
  items: TActivityRaw[]
  loadedRaw: bigint
  total: bigint
  hasMore: boolean
}

type TOptions = {
  filter?: TActivityFilter
  loadHistory?: boolean
}

const emptyPagination = () => createActivityPagination() as TActivityPagination

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(t`Activity records failed to load`)

export const useUsdxActivityData = ({
  filter = 'all',
  loadHistory = false,
}: TOptions = {}) => {
  const { i18n } = useLingui()
  const usdx = useMemo(() => resolveUsdxConfig(publicRuntimeConfig), [])
  const { address, chainId: walletChainId } = useAccount()
  const chainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const publicClient = usePublicClient({ chainId })
  const requestKey = getActivityRequestKey(walletChainId ?? chainId, diamond, address)
  const activeKeyRef = useRef(requestKey)
  activeKeyRef.current = requestKey
  const generationRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const paginationRef = useRef<TActivityPagination>(emptyPagination())

  const [recentRaw, setRecentRaw] = useState<TActivityRaw[]>([])
  const [pagination, setPagination] = useState<TActivityPagination>(() => emptyPagination())
  const [dataKey, setDataKey] = useState(requestKey)
  const [recentLoading, setRecentLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [recentError, setRecentError] = useState<Error | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const replacePagination = useCallback((next: TActivityPagination) => {
    paginationRef.current = next
    setPagination(next)
  }, [])

  const readActivities = useCallback(
    async (offset: bigint, limit: bigint) => {
      const prerequisiteError = getActivityReadPrerequisiteError({
        address,
        chainId,
        diamond,
        hasPublicClient: Boolean(publicClient),
      })
      if (prerequisiteError) throw prerequisiteError
      if (!publicClient || !address || !diamond) return [[], 0n] as const
      return publicClient.readContract({
        address: diamond,
        abi: usdxDiamondAbi,
        functionName: 'activitiesOf',
        args: [address, offset, limit],
      })
    },
    [address, chainId, diamond, publicClient]
  )

  const refetch = useCallback(async () => {
    const generation = ++generationRef.current
    const key = requestKey
    const initial = emptyPagination()
    setDataKey(key)
    loadingMoreRef.current = false
    setLoadingMore(false)
    setRecentRaw([])
    replacePagination(initial)
    setRecentError(null)
    setError(null)

    const prerequisiteError = getActivityReadPrerequisiteError({
      address,
      chainId,
      diamond,
      hasPublicClient: Boolean(publicClient),
    })
    if (prerequisiteError) {
      setRecentError(prerequisiteError)
      if (loadHistory) setError(prerequisiteError)
      setRecentLoading(false)
      setHistoryLoading(false)
      return
    }
    if (!address) {
      setRecentLoading(false)
      setHistoryLoading(false)
      return
    }

    const isCurrent = () =>
      generationRef.current === generation && activeKeyRef.current === key

    setRecentLoading(true)
    const recentTask = readActivities(0n, 5n)
      .then(([list]) => {
        if (isCurrent()) setRecentRaw([...list].map((row) => normalizeActivityRaw(row)))
      })
      .catch((readError: unknown) => {
        if (isCurrent()) setRecentError(toError(readError))
      })
      .finally(() => {
        if (isCurrent()) setRecentLoading(false)
      })

    let historyTask: Promise<void> = Promise.resolve()
    if (loadHistory) {
      setHistoryLoading(true)
      historyTask = readActivities(0n, BigInt(ACTIVITY_PAGE_SIZE))
        .then(([list, total]) => {
          if (!isCurrent()) return
          replacePagination(appendActivityPage(initial, [...list].map((row) => normalizeActivityRaw(row)), total))
        })
        .catch((readError: unknown) => {
          if (isCurrent()) setError(toError(readError))
        })
        .finally(() => {
          if (isCurrent()) setHistoryLoading(false)
        })
    } else {
      setHistoryLoading(false)
    }

    await Promise.all([recentTask, historyTask])
  }, [
    address,
    chainId,
    diamond,
    loadHistory,
    publicClient,
    readActivities,
    replacePagination,
    requestKey,
  ])

  useEffect(() => {
    void refetch()
    return () => {
      generationRef.current += 1
    }
  }, [refetch])

  const loadMore = useCallback(async () => {
    const current = paginationRef.current
    if (
      !loadHistory ||
      !requestKey ||
      !publicClient ||
      !current.hasMore ||
      loadingMoreRef.current
    ) {
      return
    }

    const generation = generationRef.current
    const key = requestKey
    loadingMoreRef.current = true
    setLoadingMore(true)
    setError(null)

    try {
      const [list, total] = await readActivities(
        getActivityOffset(current),
        BigInt(ACTIVITY_PAGE_SIZE)
      )
      if (generationRef.current !== generation || activeKeyRef.current !== key) return
      replacePagination(appendActivityPage(current, [...list].map((row) => normalizeActivityRaw(row)), total))
    } catch (readError: unknown) {
      if (generationRef.current === generation && activeKeyRef.current === key) {
        setError(toError(readError))
      }
    } finally {
      if (generationRef.current === generation && activeKeyRef.current === key) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }, [loadHistory, publicClient, readActivities, replacePagination, requestKey])

  const identityChanged = dataKey !== requestKey
  const recent = useMemo(
    () => mapActivities(identityChanged ? [] : recentRaw),
    [i18n.locale, identityChanged, recentRaw]
  )
  const items = useMemo(
    () => mapActivities(identityChanged ? [] : pagination.items),
    [i18n.locale, identityChanged, pagination.items]
  )
  const filteredItems = useMemo(
    () =>
      mapActivities(filterActivityItems(identityChanged ? [] : pagination.items, filter)),
    [filter, i18n.locale, identityChanged, pagination.items]
  )

  return {
    recent,
    items,
    filteredItems,
    total: identityChanged ? 0n : pagination.total,
    loadedRaw: identityChanged ? 0n : pagination.loadedRaw,
    loading: identityChanged
      ? Boolean(requestKey)
      : loadHistory
      ? historyLoading
      : recentLoading,
    recentLoading: identityChanged ? Boolean(requestKey) : recentLoading,
    loadingMore: identityChanged ? false : loadingMore,
    hasMore: identityChanged ? false : pagination.hasMore,
    error: identityChanged ? null : error,
    recentError: identityChanged ? null : recentError,
    loadMore,
    refetch,
  }
}
