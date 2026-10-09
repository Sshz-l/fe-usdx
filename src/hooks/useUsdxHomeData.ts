import { useCallback, useEffect, useMemo } from 'react'
import getConfig from 'next/config'
import { useAccount, useBalance, useBlockNumber, useReadContract } from 'wagmi'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { resolveUsdxConfig } from '@/constants/usdxConfig'
import {
  getHomeHero,
  getMintUnavailableReason,
  getProtocolCoverage,
  isPriceOk,
} from '@/utils/usdx/homeViews'
import { dToUsdtIn } from '@/utils/usdx/chainViews'
import { parseTokenAmount } from '@/utils/usdx/amounts'
import { asSellQuoteView } from '@/utils/usdx/swapQuote'
import { asSellOrderView, sumQueuedRemaining } from '@/utils/usdx/orderViews'
import { useUsdxActivityData } from '@/hooks/useUsdxActivityData'

const { publicRuntimeConfig } = getConfig()

export const useUsdxConfig = () =>
  useMemo(() => resolveUsdxConfig(publicRuntimeConfig), [])

export const useUsdxHomeData = () => {
  const usdx = useUsdxConfig()
  const activityData = useUsdxActivityData()
  const { address, isConnected, chainId } = useAccount()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const targetChainId = usdx?.chainId
  const canRead = Boolean(diamond && targetChainId)
  const userEnabled = canRead && Boolean(address)
  const { data: blockNumber } = useBlockNumber({
    chainId: targetChainId,
    watch: userEnabled,
  })

  const protocolQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'protocolView',
    chainId: targetChainId,
    query: { enabled: canRead, retry: 2, refetchOnMount: 'always' },
  })
  const userQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'userUsdxView',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: userEnabled, retry: 2, refetchOnMount: 'always' },
  })
  const protocolConfigQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'protocolConfig',
    chainId: targetChainId,
    query: { enabled: canRead, retry: 2, refetchOnMount: 'always' },
  })
  const protocolConfig = protocolConfigQuery.data
  const pauseMint = protocolConfig?.pauseMint === true
  const pauseRelease = protocolConfig?.pauseRelease === true
  const pauseRedeem = protocolConfig?.pauseRedeem === true
  const stabilizerPausedQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'stabilizerPaused',
    chainId: targetChainId,
    query: { enabled: canRead },
  })
  const inventoryQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'usdxInventory',
    chainId: targetChainId,
    query: { enabled: canRead },
  })
  const protocol = protocolQuery.data
  const user = userQuery.data
  const hero = getHomeHero(user)
  const coverage = getProtocolCoverage(protocol)
  const priceOk = isPriceOk(protocol)
  const protocolBusy =
    canRead &&
    (protocolQuery.isLoading ||
      protocolQuery.isPending ||
      (protocolQuery.isFetching && protocolQuery.data == null))
  const pauseBusy =
    canRead &&
    (protocolConfigQuery.isLoading ||
      protocolConfigQuery.isPending ||
      (protocolConfigQuery.isFetching && protocolConfigQuery.data == null))
  const mintGateLoading = protocolBusy || pauseBusy
  const mintBlockedReason = getMintUnavailableReason({
    hasConfig: Boolean(usdx),
    pauseMint,
    pauseConfigLoading: pauseBusy,
    pauseConfigError: protocolConfigQuery.isError,
    protocolLoading: mintGateLoading,
    protocolError: protocolQuery.isError,
    protocolLoaded: protocolQuery.isSuccess && protocol != null,
    priceOk,
  })
  const mintBlocked = mintBlockedReason != null

  const refetchProtocol = protocolQuery.refetch
  const refetchProtocolConfig = protocolConfigQuery.refetch
  const refetchInventory = inventoryQuery.refetch
  const refetchUser = userQuery.refetch
  const refetchActivities = activityData.refetch

  useEffect(() => {
    if (!userEnabled) return
    void refetchUser()
  }, [blockNumber, userEnabled, address, refetchUser])

  const refetchAll = useCallback(async () => {
    const tasks: Promise<unknown>[] = [
      refetchProtocol(),
      refetchProtocolConfig(),
      refetchInventory(),
    ]
    if (userEnabled) {
      tasks.push(refetchUser(), refetchActivities())
    }
    await Promise.allSettled(tasks)
  }, [
    refetchActivities,
    refetchInventory,
    refetchProtocolConfig,
    refetchProtocol,
    refetchUser,
    userEnabled,
  ])

  return {
    usdx,
    address,
    isConnected,
    chainId,
    onTargetChain: Boolean(isConnected && chainId === targetChainId),
    protocol,
    user,
    hero,
    coverage,
    activities: activityData.recent,
    activitiesLoading: activityData.recentLoading,
    activitiesError: activityData.recentError,
    activityData,
    stabilizerPaused: stabilizerPausedQuery.data === true,
    pauseRelease,
    pauseRedeem,
    pauseConfigLoading: pauseBusy,
    pauseConfigError: protocolConfigQuery.isError,
    usdxInventory: inventoryQuery.data ?? null,
    mintBlocked,
    mintBlockedReason,
    mintGateLoading,
    pauseMint,
    protocolError: protocolQuery.isError || protocolConfigQuery.isError,
    protocolLoaded: protocolQuery.isSuccess && protocol != null,
    /** @deprecated 使用 mintBlocked */
    mintDisabled: mintBlocked,
    priceOk,
    protocolLoading: protocolQuery.isLoading,
    userLoading: userQuery.isLoading,
    userError: userQuery.isError,
    refetchAll,
  }
}

/** 用户 BSC USDT 钱包余额（兑换页支付用） */
export const useUsdxUsdtBalance = () => {
  const usdx = useUsdxConfig()
  const { address, isConnected } = useAccount()
  const chainId = usdx?.chainId
  const token = usdx?.usdt as `0x${string}` | undefined
  const enabled = Boolean(token && chainId && address && isConnected)

  const { data: blockNumber } = useBlockNumber({
    chainId,
    watch: enabled,
  })

  const query = useBalance({
    address: enabled ? (address as `0x${string}`) : undefined,
    token,
    chainId,
    scopeKey: 'usdx-usdt-balance',
    query: {
      enabled,
      refetchOnMount: 'always',
    },
  })
  const refetch = query.refetch

  useEffect(() => {
    if (!enabled) return
    void refetch()
  }, [blockNumber, enabled, address, token, chainId, refetch])

  return {
    amount: query.data?.value ?? null,
    raw: query.data?.value ?? null,
    decimals: query.data?.decimals ?? 18,
    isLoading: enabled && (query.isLoading || query.isFetching) && query.data == null,
    isError: query.isError,
    refetch,
  }
}

/** 用户 BSC BOX 钱包余额（铸造页用） */
export const useUsdxBoxBalance = () => {
  const usdx = useUsdxConfig()
  const { address, isConnected } = useAccount()
  const chainId = usdx?.chainId
  const token = usdx?.box as `0x${string}` | undefined
  const enabled = Boolean(token && chainId && address && isConnected)

  const query = useBalance({
    address: enabled ? (address as `0x${string}`) : undefined,
    token,
    chainId,
    scopeKey: 'usdx-box-balance',
    query: { enabled, refetchOnMount: 'always' },
  })

  return {
    amount: query.data?.value ?? null,
    raw: query.data?.value ?? null,
    isLoading: enabled && (query.isLoading || query.isFetching) && query.data == null,
    isError: query.isError,
    refetch: query.refetch,
  }
}

export const useUsdxMintQuote = (dRaw: string) => {
  const usdx = useUsdxConfig()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const chainId = usdx?.chainId
  const usdtIn = dToUsdtIn(dRaw)
  const enabled = Boolean(diamond && chainId && usdtIn > 0n)

  const query = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'quoteMint',
    args: [usdtIn],
    chainId,
    query: { enabled, retry: 2, refetchOnMount: 'always' },
  })

  return {
    usdtIn,
    quote: query.data,
    loading:
      query.isLoading ||
      query.isPending ||
      (query.isFetching && query.data == null),
    error: query.error,
  }
}

export const useUsdxStabilizer = () => {
  const usdx = useUsdxConfig()
  const { address } = useAccount()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const chainId = usdx?.chainId
  const canRead = Boolean(diamond && chainId)
  const userEnabled = canRead && Boolean(address)

  const inventoryQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'usdxInventory',
    chainId,
    query: { enabled: canRead },
  })
  const poolQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'poolUSDX',
    chainId,
    query: { enabled: canRead },
  })
  const reserveQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'availableReserve',
    chainId,
    query: { enabled: canRead },
  })
  const pausedQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'stabilizerPaused',
    chainId,
    query: { enabled: canRead },
  })
  const openQueueOrderCountQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'openQueueOrderCount',
    chainId,
    query: { enabled: canRead },
  })
  const ordersQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'activeSellOrdersOf',
    args: address ? [address, 0n, 20n] : undefined,
    chainId,
    query: { enabled: userEnabled },
  })

  const openOrders = useMemo(() => {
    const list = ordersQuery.data?.[0] ?? []
    return list
      .map((item) => asSellOrderView(item))
      .filter((item): item is NonNullable<ReturnType<typeof asSellOrderView>> => item != null)
  }, [ordersQuery.data])

  const inventoryLoading =
    canRead &&
    (inventoryQuery.isLoading ||
      inventoryQuery.isPending ||
      inventoryQuery.isFetching)
  const pauseLoading =
    canRead &&
    (pausedQuery.isLoading || pausedQuery.isPending || pausedQuery.isFetching)
  const refetchStabilizerInventory = inventoryQuery.refetch
  const refetchPool = poolQuery.refetch
  const refetchReserve = reserveQuery.refetch
  const refetchPause = pausedQuery.refetch
  const refetchOpenQueueOrderCount = openQueueOrderCountQuery.refetch
  const refetchOrders = ordersQuery.refetch

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchStabilizerInventory(),
      refetchPool(),
      refetchReserve(),
      refetchPause(),
      refetchOpenQueueOrderCount(),
      refetchOrders(),
    ])
  }, [
    refetchOpenQueueOrderCount,
    refetchOrders,
    refetchPause,
    refetchPool,
    refetchReserve,
    refetchStabilizerInventory,
  ])

  return {
    inventory: inventoryQuery.data ?? null,
    inventoryLoading,
    inventoryError: inventoryQuery.isError,
    poolUsdx: poolQuery.data ?? null,
    poolLoading:
      canRead &&
      (poolQuery.isLoading ||
        poolQuery.isPending ||
        (poolQuery.isFetching && poolQuery.data == null)),
    poolError: poolQuery.isError,
    reserve: reserveQuery.data ?? null,
    reserveLoading:
      canRead &&
      (reserveQuery.isLoading ||
        reserveQuery.isPending ||
        (reserveQuery.isFetching && reserveQuery.data == null)),
    paused: pausedQuery.data ?? null,
    pauseLoading,
    pauseError: pausedQuery.isError,
    openOrders,
    openOrderAmount: sumQueuedRemaining(openOrders),
    ordersLoading: ordersQuery.isLoading,
    /** PROTO.stabQ.total → usdxInventory() */
    globalQueueAmount: inventoryQuery.data ?? null,
    /** PROTO.stabQ.count → openQueueOrderCount() */
    globalQueueCount:
      openQueueOrderCountQuery.data == null
        ? null
        : Number(openQueueOrderCountQuery.data),
    globalQueueCountLoading:
      canRead &&
      (openQueueOrderCountQuery.isLoading ||
        openQueueOrderCountQuery.isPending ||
        (openQueueOrderCountQuery.isFetching &&
          openQueueOrderCountQuery.data == null)),
    globalQueueCountError: openQueueOrderCountQuery.isError,
    refetch,
  }
}

export const useUsdxSellQuote = (amountRaw: string) => {
  const usdx = useUsdxConfig()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const chainId = usdx?.chainId
  const parsed = parseTokenAmount(amountRaw)
  const amount = parsed.ok ? parsed.amount : 0n
  const enabled = Boolean(diamond && chainId && amount > 0n)

  const query = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'quoteSellUsdx',
    args: [amount],
    chainId,
    query: { enabled, retry: 2, refetchOnMount: 'always' },
  })

  const parsedQuote = asSellQuoteView(query.data)
  const instant = parsedQuote.instant
  const netUsdt = parsedQuote.netUsdt

  return {
    amount,
    instant,
    netUsdt,
    loading:
      enabled &&
      (query.isLoading ||
        query.isPending ||
        (query.isFetching && query.data == null)),
    error: query.error,
    refetch: query.refetch,
  }
}
