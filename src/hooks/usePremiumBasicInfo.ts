import { useQuery } from '@tanstack/react-query'

import { parsePremiumBasicInfo } from '@/utils/premiumBasicInfo'
import { getBasicInfo } from '@/services/stripe'
import { useStore } from '@/stores'
import { useValidWalletLogin } from '@/hooks/useValidWalletLogin'
import { isDeBoxApp } from '@/utils/wagmiConnector'

export const PREMIUM_BASIC_INFO_QUERY_KEY = ['premium-basic-info'] as const

export const getPremiumBasicInfoQueryKey = (userId?: string | number | null) =>
  [...PREMIUM_BASIC_INFO_QUERY_KEY, userId ?? 'guest'] as const

export const usePremiumBasicInfo = (options?: { enabled?: boolean }) => {
  const { walletStore } = useStore()
  const userId = walletStore?.curUserInfo?.userId
  const hasAuthToken = Boolean(walletStore?.curUserInfo?.token)
  const isLoggedIn = useValidWalletLogin()
  // DeBox 重连窗口内：token 已存在但 wagmi 尚未连上时，仍拉会员信息供 manage 使用
  const canFetchDuringDeBoxReconnect =
    isDeBoxApp() && hasAuthToken && !isLoggedIn

  return useQuery({
    queryKey: getPremiumBasicInfoQueryKey(userId),
    enabled: options?.enabled ?? (hasAuthToken || isLoggedIn || canFetchDuringDeBoxReconnect),
    queryFn: async () => {
      const res = await getBasicInfo()
      return parsePremiumBasicInfo(res)
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
