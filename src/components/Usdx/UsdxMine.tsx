import { useEffect, useMemo, useState } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import getConfig from 'next/config'

import { formatUsdxAmount, formatUsdxClaimableBadge, formatUsdxMoney, getClaimableStatClass } from '@/utils/usdx/homeViews'
import { shortUsdxAddr } from '@/utils/usdx/contractViews'
import { getUsdxMineWalletGate, type TUsdxWalletState } from '@/utils/usdx/walletOptions'
import { getActivityListState, getMineActivityPresentation } from '@/utils/usdx/activityViews'
import { getActivityNavigation } from '@/utils/usdx/screens'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { UsdxContractSheet } from './UsdxContractSheet'
import { UsdxIcon } from './UsdxIcon'

const { publicRuntimeConfig } = getConfig()

type THero = ReturnType<typeof import('@/utils/usdx/homeViews').getHomeHero>
type TActivity = ReturnType<typeof import('@/utils/usdx/activityViews').formatActivityRow>
type TIconName = Parameters<typeof UsdxIcon>[0]['name']

type TProps = {
  hero: THero
  activities: TActivity[]
  activitiesLoading?: boolean
  activitiesError?: boolean
  walletState: TUsdxWalletState
  active?: boolean
  onConnect: () => void
  onSwitchChain: () => void
  onGo: (screen: string) => void
  onRetryActivities: () => void
  onOpenActivity: (row: TActivity) => void
}

export const UsdxMine = ({
  hero,
  activities,
  activitiesLoading = false,
  activitiesError = false,
  walletState,
  active = true,
  onConnect,
  onSwitchChain,
  onGo,
  onRetryActivities,
  onOpenActivity,
}: TProps) => {
  const { i18n } = useLingui()
  const usdx = useUsdxConfig()
  const [contractOpen, setContractOpen] = useState(false)
  const tokenAddress = usdx?.usdx
  const assetPrefix = publicRuntimeConfig.cdn || ''
  const walletGate = getUsdxMineWalletGate(walletState)
  const activityState = getActivityListState({
    loading: activitiesLoading,
    error: activitiesError,
    count: activities.length,
  })
  /* 与权威 HTML renderRecentAct 一致：空列表整块隐藏；加载/失败仍展示以便重试 */
  const showActivityWrap = activityState !== 'empty'
  const claimableBadge = useMemo(
    () =>
      hero.canClaim ? t`${formatUsdxClaimableBadge(hero.claimable)} Claimable` : '',
    [hero.canClaim, hero.claimable, i18n.locale]
  )

  useEffect(() => {
    if (!active) setContractOpen(false)
  }, [active])

  return (
    <section
      className={`screen screen--tab${active ? ' active' : ''}`}
      id="s-mine"
      aria-label={t`My`}
      aria-hidden={!active}
    >
      <div className="screen-body">
        {walletGate.visible ? (
          <div className="home-empty compact">
            <div className="empty-illustration">
              <UsdxIcon name={walletGate.action === 'switch-chain' ? 'alert-triangle' : 'wallet'} />
            </div>
            <div className="empty-desc">{walletGate.description}</div>
            <button
              className="btn btn-primary btn-md"
              type="button"
              style={{ marginTop: 'var(--sp-14)' }}
              onClick={walletGate.action === 'switch-chain' ? onSwitchChain : onConnect}
            >
              {walletGate.label}
            </button>
          </div>
        ) : (
          <>
            <div className="usdx-hero">
              <div className="uh-label">{t`My USDX`}</div>
              <div className="uh-amt">
                <span className="num">{formatUsdxAmount(hero.total, 2)}</span>
              </div>
              <div className="uh-stats">
                <div>
                  <div className="uhs-k">{t`Claimable`}</div>
                  <div className={`uhs-v num ${getClaimableStatClass(hero.claimable)}`}>
                    {formatUsdxClaimableBadge(hero.claimable)}
                  </div>
                </div>
                <div>
                  <div className="uhs-k">{t`Pending unlock`}</div>
                  <div className="uhs-v num muted">{formatUsdxMoney(hero.remainingLock)}</div>
                </div>
                <div>
                  <div className="uhs-k">{t`Wallet balance`}</div>
                  <div className="uhs-v num subtle">{formatUsdxMoney(hero.wallet)}</div>
                </div>
              </div>
            </div>

            <div className="mine-menu">
              <button className="li-row li-2col" type="button" onClick={() => onGo('s-claim')}>
                <div className="li-title">{t`My release plans`}</div>
                <div className="mine-aside">
                  <span className={`num${hero.canClaim ? ' pos' : ''}`}>{claimableBadge}</span>
                  <UsdxIcon name="chevron-right" className="li-arrow" size={16} />
                </div>
              </button>
              <button className="li-row li-2col" type="button" onClick={() => onGo('s-redeem')}>
                <div className="li-title">{t`Redeem USDX`}</div>
                <div className="mine-aside">
                  <UsdxIcon name="chevron-right" className="li-arrow" size={16} />
                </div>
              </button>
              <button
                className="li-row li-2col"
                type="button"
                disabled={!tokenAddress}
                aria-label={t`View USDX contract`}
                onClick={() => setContractOpen(true)}
              >
                <div className="li-title">{t`USDX contract`}</div>
                <div className="mine-aside">
                  <span className="num">{shortUsdxAddr(tokenAddress)}</span>
                  <UsdxIcon name="chevron-right" className="li-arrow" size={16} />
                </div>
              </button>
            </div>

            {showActivityWrap ? (
              <div id="mineActWrap">
                <div className="sec-title">
                  <span>{t`Recent activity`}</span>
                  <button className="sec-more" type="button" onClick={() => onGo('s-activity')}>
                    {t`All`}
                    <UsdxIcon name="chevron-right" size={14} />
                  </button>
                </div>
                {activityState === 'loading' ? (
                  <div className="side-note" style={{ padding: 'var(--sp-12) var(--sp-2)' }}>
                    {t`Loading…`}
                  </div>
                ) : activityState === 'error' ? (
                  <div className="side-note" style={{ padding: 'var(--sp-12) var(--sp-2)' }}>
                    {t`Failed to load activity`}{' '}
                    <button className="pf-link" type="button" onClick={onRetryActivities}>
                      {t`Retry`}
                    </button>
                  </div>
                ) : (
                  <div className="act-list" id="mineActList">
                    {activities.map((row, idx) => {
                      const view = getMineActivityPresentation(row)
                      const nav = getActivityNavigation(row.kind, 's-mine')
                      const clickable = nav.type !== 'none'
                      const content = (
                        <>
                          <span className={`act-ic${view.amountPos ? ' pos' : ''}`}>
                            <UsdxIcon name={view.icon as TIconName} />
                          </span>
                          <div className="home-act-main">
                            <div className="li-title">{view.title}</div>
                          </div>
                          <div className="home-act-right">
                            <span className={`act-amt${view.amountPos ? ' pos' : ''}`}>
                              {view.amount}
                            </span>
                            <span className="act-row-time-line">
                              <span className="li-sub">{view.date}</span>
                              {clickable ? (
                                <UsdxIcon name="chevron-right" className="act-row-go" size={14} />
                              ) : null}
                            </span>
                          </div>
                        </>
                      )
                      return clickable ? (
                        <button
                          className="li-row li-row--link"
                          type="button"
                          key={`${row.kind}-${String(row.ts)}-${idx}`}
                          onClick={() => onOpenActivity(row)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="li-row" key={`${row.kind}-${String(row.ts)}-${idx}`}>
                          {content}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
      <UsdxContractSheet
        open={contractOpen}
        address={tokenAddress}
        iconSrc={`${assetPrefix}/usdx/assets/usdx.png`}
        onClose={() => setContractOpen(false)}
      />
    </section>
  )
}
