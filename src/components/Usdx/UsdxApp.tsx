import getConfig from 'next/config'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import { observer } from 'mobx-react-lite'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { USDX_CHAIN_ID } from '@/constants/usdxConfig'
import { useDeBoxDirectConnect } from '@/hooks/useDeBoxDirectConnect'
import {
  showUsdxToastError,
  showUsdxToastSuccess,
  USDX_TOAST_CONTAINER,
  USDX_TOAST_DURATION_MS,
} from '@/constants/usdxToast'
import { useUsdxHomeData } from '@/hooks/useUsdxHomeData'
import { useUsdxPositions } from '@/hooks/useUsdxPositions'
import { useUsdxWallet } from '@/hooks/useUsdxWallet'
import { useStore } from '@/stores'
import {
  applyUsdxBodyScreen,
  applyUsdxBodyScrolled,
  applyUsdxHtmlTheme,
  getUsdxThemeFromSearch,
  shouldUsdxBarScrolled,
} from '@/utils/usdx/documentChrome'
import {
  getActivityNavigation,
  getUsdxBackScreen,
  parseUsdxRoute,
  shouldRefreshUsdxWalletOnScreen,
  toUsdxHash,
} from '@/utils/usdx/screens'
import {
  formatActivityRowFromRouteKey,
  getSwapDetailRouteKey,
} from '@/utils/usdx/activityViews'
import { getUsdxScreenView } from '@/utils/usdx/screenRegistry'
import { asProtocolView } from '@/utils/usdx/homeViews'
import { refreshUsdxAfterClaim } from '@/utils/usdx/claimRefresh'
import { isDeBoxApp } from '@/utils/wagmiConnector'
import { isManualLogoutPending } from '@/utils/walletIdentity'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { UsdxMine } from './UsdxMine'
import { UsdxMint } from './UsdxMint'
import { UsdxClaim } from './UsdxClaim'
import { UsdxPlan } from './UsdxPlan'
import { UsdxSwap } from './UsdxSwap'
import { UsdxRedeem } from './UsdxRedeem'
import { UsdxActivity } from './UsdxActivity'
import { UsdxSwapDetail } from './UsdxSwapDetail'
import { UsdxAccountSheet } from './UsdxAccountSheet'
import { UsdxIcon } from './UsdxIcon'

const { publicRuntimeConfig } = getConfig()

const MAIN_TAB_IDS = ['s-mint', 's-swap', 's-redeem', 's-mine'] as const
const isMainTabScreen = (id: string) =>
  (MAIN_TAB_IDS as readonly string[]).includes(id)

const shortAddr = (address?: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

const addressAvatarLabel = (address?: string) =>
  address && address.length > 4 ? address.slice(2, 4).toUpperCase() : '?'

const UsdxAppInner = () => {
  const { i18n } = useLingui()
  const home = useUsdxHomeData()
  const positions = useUsdxPositions()
  const [route, setRoute] = useState(() =>
    typeof window === 'undefined'
      ? { screen: 's-mint', planMintId: null, swapDetailKey: null, swapDetailBack: null }
      : parseUsdxRoute(window.location.hash)
  )
  const [planBack, setPlanBack] = useState('s-claim')
  const [accountOpen, setAccountOpen] = useState(false)
  const [activityRow, setActivityRow] = useState<
    ReturnType<typeof import('@/utils/usdx/activityViews').formatActivityRow> | null
  >(null)
  const [swapSheetOpen, setSwapSheetOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const prevScreenRef = useRef<string | null>(null)
  const prevMainTabRef = useRef<string>(route.screen)
  const cdnPrefix = publicRuntimeConfig.cdn || ''
  const proto = asProtocolView(home.protocol)
  const targetChainId = home.usdx?.chainId || USDX_CHAIN_ID
  const wallet = useUsdxWallet(targetChainId)
  const { walletStore } = useStore()
  const { tryDeBoxDirectConnect } = useDeBoxDirectConnect({ showError: showUsdxToastError })
  const { address, isConnected, chainId, walletState } = wallet
  const userAvatar = walletStore.curAccountInfo?.pic || ''
  const tabItems = useMemo(
    () =>
      [
        { id: 's-mint', label: t`Mint` },
        { id: 's-swap', label: t`Swap` },
        { id: 's-redeem', label: t`Redeem` },
        { id: 's-mine', label: t`My` },
      ] as const,
    [i18n.locale]
  )
  const screen = route.screen
  const planMintId = route.planMintId
  const swapDetailRow = useMemo(() => {
    if (screen !== 's-swap-detail' || !route.swapDetailKey) return null
    return formatActivityRowFromRouteKey(route.swapDetailKey)
  }, [i18n.locale, route.swapDetailKey, screen])
  const swapDetailBack =
    route.swapDetailBack || getUsdxBackScreen('s-swap-detail')

  const go = useCallback(
    (
      next: string,
      params?: {
        planMintId?: bigint | null
        swapDetailKey?: ReturnType<typeof getSwapDetailRouteKey> | null
        swapDetailBack?: string
      }
    ) => {
      if (typeof window === 'undefined') return
      window.location.hash = toUsdxHash(next, params ?? {})
    },
    []
  )

  const goPlan = useCallback(
    (mintId: bigint, back: string) => {
      setPlanBack(back)
      go('s-plan', { planMintId: mintId })
    },
    [go]
  )

  const onClaimSuccess = useCallback(
    () =>
      refreshUsdxAfterClaim({
        refetchPositions: positions.refetch,
        refetchHome: home.refetchAll,
      }),
    [home.refetchAll, positions.refetch]
  )

  useEffect(() => {
    const apply = () => setRoute(parseUsdxRoute(window.location.hash))
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const prevTheme = html.getAttribute('data-theme')
    applyUsdxHtmlTheme(getUsdxThemeFromSearch(window.location.search), html)
    return () => {
      if (prevTheme == null) html.removeAttribute('data-theme')
      else html.setAttribute('data-theme', prevTheme)
    }
  }, [])

  useEffect(() => {
    if (route.screen !== 's-plan' || route.planMintId != null) return
    if (positions.loading || positions.positions.length !== 1) return
    go('s-plan', { planMintId: positions.positions[0].mintId })
  }, [go, positions.loading, positions.positions, route.planMintId, route.screen])

  useEffect(() => {
    applyUsdxBodyScreen(screen, document.body)
  }, [screen])

  /** 一级 Tab 切换时回到顶部，避免滚动位置残留导致顶栏/内容跳动 */
  useEffect(() => {
    const prev = prevMainTabRef.current
    prevMainTabRef.current = screen
    if (!isMainTabScreen(screen) || !isMainTabScreen(prev) || screen === prev) return
    window.scrollTo(0, 0)
    applyUsdxBodyScrolled(false, document.body)
    rootRef.current?.removeAttribute('data-scrolled')
  }, [screen])

  /** DeBox WebView 内进入页面时自动连接钱包并触发签名登录 */
  useEffect(() => {
    if (!isDeBoxApp() || isManualLogoutPending()) return
    void tryDeBoxDirectConnect({ walletType: 'evm' })
  }, [tryDeBoxDirectConnect])

  /** 进入释放计划详情时补拉一次仓位（新铸造后列表可能尚未含目标 mintId）；找不到则停止，避免脏 mintId 死循环请求 */
  const planResolveKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (screen !== 's-plan' || planMintId == null || !isConnected) {
      if (screen !== 's-plan') planResolveKeyRef.current = null
      return
    }
    const found = positions.positions.some((item) => item.mintId === planMintId)
    if (found) {
      planResolveKeyRef.current = null
      return
    }
    if (positions.loading || positions.aggregateLoading) return
    const key = String(planMintId)
    if (planResolveKeyRef.current === key) return
    planResolveKeyRef.current = key
    void positions.refetch()
  }, [
    screen,
    planMintId,
    isConnected,
    positions.positions,
    positions.loading,
    positions.aggregateLoading,
    positions.refetch,
  ])

  /** 切到「我的 / 记录」时刷新活动流水，避免子页 tx 成功后列表仍显示旧快照 */
  useEffect(() => {
    if (screen !== 's-mine' && screen !== 's-activity') return
    if (!isConnected) return
    void home.activityData.refetch()
  }, [screen, isConnected, home.activityData.refetch])

  /** 兑换 / 赎回 / 我的 Tab 常驻挂载，切页时重拉 userUsdxView，避免铸造成功后余额仍是旧快照 */
  useEffect(() => {
    if (!shouldRefreshUsdxWalletOnScreen(screen) || !isConnected) return
    void home.refetchAll()
  }, [screen, isConnected, home.refetchAll])

  /** 进入「我的释放计划」时刷新仓位，保留旧数据展示直至新数据返回 */
  useEffect(() => {
    const enteredClaim = screen === 's-claim' && prevScreenRef.current !== 's-claim'
    prevScreenRef.current = screen
    if (!enteredClaim || !isConnected) return
    void positions.refetch({ keepStale: positions.positions.length > 0 })
  }, [screen, isConnected, positions.positions.length, positions.refetch])

  useEffect(() => {
    const body = document.body
    const onScroll = () => {
      const scrolled = shouldUsdxBarScrolled(window.scrollY)
      applyUsdxBodyScrolled(scrolled, body)
      rootRef.current?.toggleAttribute('data-scrolled', scrolled)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      body.removeAttribute('data-screen')
      body.removeAttribute('data-scrolled')
    }
  }, [])

  useEffect(() => {
    setAccountOpen(false)
  }, [address, chainId])

  const openConnect = useCallback(async () => {
    const { handled } = await tryDeBoxDirectConnect({ walletType: 'evm' })
    if (!handled) {
      walletStore.connectModal?.onOpen?.({ walletType: 'evm' })
    }
  }, [tryDeBoxDirectConnect, walletStore.connectModal])

  const onSwitchNetwork = async () => {
    const result = await wallet.switchToTargetChain()
    if (!result.ok && !result.rejected) {
      showUsdxToastError(result.message)
    }
  }

  const onWalletClick = async () => {
    if (walletState === 'off') {
      openConnect()
      return
    }
    if (walletState !== 'wrong') {
      setAccountOpen(true)
      return
    }
    await onSwitchNetwork()
  }

  const onDisconnect = async () => {
    setAccountOpen(false)
    try {
      await wallet.disconnectWallet()
      showUsdxToastSuccess(t`Disconnected from wallet`)
    } catch (error: unknown) {
      if (!isUserRejectedWalletError(error)) {
        const message = error instanceof Error ? error.message : String(error)
        showUsdxToastError(message || t`Disconnect failed`)
      }
    }
  }

  const openActivity = (
    row: ReturnType<typeof import('@/utils/usdx/activityViews').formatActivityRow>,
    from: 's-mine' | 's-activity'
  ) => {
    const nav = getActivityNavigation(row.kind, from)
    setActivityRow(row)
    if (nav.type === 'sheet') {
      setSwapSheetOpen(true)
      return
    }
    if (nav.type === 'screen' && nav.screen === 's-plan') {
      const id = row.mintId && row.mintId > 0n ? row.mintId : null
      if (id != null) goPlan(id, nav.back || from)
      else go('s-claim')
      return
    }
    if (nav.type === 'screen' && nav.screen === 's-swap-detail') {
      go('s-swap-detail', {
        swapDetailKey: getSwapDetailRouteKey(row),
        swapDetailBack: nav.back || from,
      })
    }
  }

  const renderSecondaryScreen = () => {
    const view = getUsdxScreenView(screen)
    if (view === 'mint' || view === 'swap' || view === 'redeem' || view === 'mine') return null
    if (view === 'claim') {
      return (
        <UsdxClaim
          positions={positions}
          pauseRelease={home.pauseRelease}
          pauseLoading={home.pauseConfigLoading}
          pauseError={home.pauseConfigError}
          onBack={() => go('s-mine')}
          onGo={go}
          onOpenPlan={(mintId) => goPlan(mintId, 's-claim')}
          onClaimSuccess={onClaimSuccess}
        />
      )
    }
    if (view === 'plan') {
      return (
        <UsdxPlan
          mintId={planMintId}
          positions={positions}
          pauseRelease={home.pauseRelease}
          pauseLoading={home.pauseConfigLoading}
          pauseError={home.pauseConfigError}
          boxPriceWad={proto?.P ?? null}
          onBack={() => go(planBack)}
          onClaimSuccess={onClaimSuccess}
        />
      )
    }
    if (view === 'activity') {
      return (
        <UsdxActivity
          onBack={() => go('s-mine')}
          onOpen={(row) => openActivity(row, 's-activity')}
        />
      )
    }
    if (view === 'swap-detail') {
      return (
        <UsdxSwapDetail
          row={swapDetailRow}
          variant="screen"
          onBack={() => go(swapDetailBack)}
        />
      )
    }
    return null
  }

  const connectLabel = t`Connect Wallet`
  const switchNetworkLabel = t`Switch Network`
  const connectAriaOn = t`Connected ${shortAddr(address)}, open account`
  const connectAriaWrong = t`Unsupported network, switch to BNB Smart Chain`

  return (
    <>
      <div
        className="usdx-root app-frame h5-form"
        data-screen={screen}
        data-locale={i18n.locale}
        ref={rootRef}
      >
        <header className="app-bar">
          <div className="brand">
            <img
              className="brand-mark"
              src={`${cdnPrefix}/usdx/assets/usdx.png`}
              alt=""
              role="presentation"
            />
            <span className="brand-name">USDX-Stablecoin</span>
          </div>
          <div className="bar-actions">
            <button
              className="connect-btn"
              type="button"
              data-state={walletState}
              aria-label={
                walletState === 'on'
                  ? connectAriaOn
                  : walletState === 'wrong'
                    ? connectAriaWrong
                    : connectLabel
              }
              onClick={() => void onWalletClick()}
            >
              {walletState === 'on' ? (
                userAvatar ? (
                  <img className="cb-avatar" src={userAvatar} alt="" />
                ) : (
                  <span className="cb-avatar" aria-hidden="true">
                    {addressAvatarLabel(address)}
                  </span>
                )
              ) : walletState === 'wrong' ? (
                <UsdxIcon name="alert-triangle" />
              ) : (
                <UsdxIcon name="wallet" />
              )}
              <span className={walletState === 'on' ? 'cb-addr' : undefined}>
                {walletState === 'off'
                  ? connectLabel
                  : walletState === 'wrong'
                    ? switchNetworkLabel
                    : shortAddr(address)}
              </span>
            </button>
          </div>
        </header>

        <nav className="tabs main-tabs" role="tablist" aria-label={t`Main navigation`}>
          {tabItems.map((tab) => {
            const on = screen === tab.id
            return (
              <button
                key={tab.id}
                className={`tab${on ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => go(tab.id)}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="flow">
          <UsdxMint
            active={screen === 's-mint'}
            pauseMint={home.pauseMint}
            protocolLoading={home.mintGateLoading}
            protocolError={home.protocolError}
            pauseConfigError={home.pauseConfigError}
            protocolLoaded={home.protocolLoaded}
            priceOk={home.priceOk}
            onConnect={() => void openConnect()}
            onNavigateAfterSuccess={() => go('s-mine')}
            onMintSuccess={async () => {
              await Promise.allSettled([home.refetchAll(), positions.refetch()])
            }}
          />
          <UsdxSwap
            active={screen === 's-swap'}
            assetPrefix={cdnPrefix}
            onConnect={() => void openConnect()}
            onRefresh={() => home.refetchAll()}
            usdxWallet={home.hero.wallet}
            userLoading={home.userLoading}
            userError={home.userError}
          />
          <UsdxRedeem
            active={screen === 's-redeem'}
            hero={home.hero}
            pauseRedeem={home.pauseRedeem}
            pauseLoading={home.pauseConfigLoading}
            pauseError={home.pauseConfigError}
            priceOk={home.priceOk}
            userLoading={home.userLoading && isConnected}
            userError={home.userError}
            treasury={proto?.T ?? null}
            onConnect={() => void openConnect()}
            onNavigateAfterSuccess={() => go('s-mine')}
            onSuccess={() => home.refetchAll()}
          />
          <UsdxMine
            active={screen === 's-mine'}
            hero={home.hero}
            activities={home.activities}
            activitiesLoading={home.activitiesLoading}
            activitiesError={Boolean(home.activitiesError)}
            walletState={walletState}
            onConnect={() => void openConnect()}
            onSwitchChain={() => void onSwitchNetwork()}
            onGo={go}
            onRetryActivities={() => void home.activityData.refetch()}
            onOpenActivity={(row) => openActivity(row, 's-mine')}
          />
          {renderSecondaryScreen()}
        </div>
        {swapSheetOpen ? (
          <UsdxSwapDetail
            row={activityRow}
            variant="sheet"
            onBack={() => setSwapSheetOpen(false)}
            onClose={() => setSwapSheetOpen(false)}
          />
        ) : null}
        <UsdxAccountSheet
          open={accountOpen}
          address={address}
          avatarUrl={userAvatar || undefined}
          walletName={wallet.walletName}
          networkLabel={
            walletState === 'wrong'
              ? t`Unsupported network, switch to BNB Smart Chain`
              : t`BNB Smart Chain`
          }
          networkWrong={walletState === 'wrong'}
          usdxBalance={home.hero.wallet}
          onClose={() => setAccountOpen(false)}
          onDisconnect={() => void onDisconnect()}
        />
        <ToastContainer
          enableMultiContainer
          containerId={USDX_TOAST_CONTAINER}
          position="bottom-center"
          autoClose={USDX_TOAST_DURATION_MS}
          hideProgressBar
          closeButton={false}
          icon={false}
          limit={1}
          pauseOnFocusLoss={false}
          draggable={false}
          toastClassName="usdx-toast"
          bodyClassName="usdx-toast-body"
          className="usdx-toast-host"
        />
      </div>
    </>
  )
}

export const UsdxApp = observer(UsdxAppInner)
