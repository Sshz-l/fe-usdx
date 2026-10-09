import { useEffect, useMemo, useState } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import {
  getActivityListPresentation,
  getActivityListState,
  groupActivitiesByDate,
} from '@/utils/usdx/activityViews'
import { getActivityNavigation } from '@/utils/usdx/screens'
import { useUsdxActivityData } from '@/hooks/useUsdxActivityData'
import { UsdxIcon } from './UsdxIcon'

type TTabId = 'all' | 'mint' | 'redeem' | 'claim' | 'swap'
type TActivity = ReturnType<typeof import('@/utils/usdx/activityViews').formatActivityRow>
type TIconName = Parameters<typeof UsdxIcon>[0]['name']

type TProps = {
  onBack: () => void
  onOpen: (row: TActivity, nav: ReturnType<typeof getActivityNavigation>) => void
}

export const UsdxActivity = ({ onBack, onOpen }: TProps) => {
  const { i18n } = useLingui()
  const tabs = useMemo(
    () =>
      [
        { id: 'all' as const, label: t`All` },
        { id: 'mint' as const, label: t`Mint` },
        { id: 'redeem' as const, label: t`Redeem` },
        { id: 'claim' as const, label: t`Claim` },
        { id: 'swap' as const, label: t`Swap` },
      ] as const,
    [i18n.locale]
  )
  const [tab, setTab] = useState<TTabId>('all')
  const data = useUsdxActivityData({ filter: tab, loadHistory: true })
  const awaitingMore =
    tab !== 'all' &&
    data.filteredItems.length === 0 &&
    data.hasMore &&
    !data.loading &&
    !data.loadingMore
  const state = getActivityListState({
    loading: data.loading,
    error: Boolean(data.error),
    count: data.filteredItems.length,
    awaitingMore,
  })
  const groups = groupActivitiesByDate(data.filteredItems)

  useEffect(() => {
    if (tab === 'all') return
    if (data.loading || data.loadingMore || !data.hasMore) return
    if (data.filteredItems.length > 0) return
    void data.loadMore()
  }, [
    tab,
    data.loading,
    data.loadingMore,
    data.hasMore,
    data.filteredItems.length,
    data.loadMore,
  ])

  return (
    <section className="screen active" id="s-activity" aria-label={t`Activity history`}>
      <div className="nav-bar">
        <button className="nav-side" type="button" aria-label={t`Back`} onClick={onBack}>
          <UsdxIcon name="chevron-left" />
        </button>
        <span className="nav-title">{t`My USDX activity`}</span>
        <span className="nav-side" />
      </div>
      <div className="screen-body">
        <div className="segmented" role="tablist" aria-label={t`Activity filters`}>
          {tabs.map((item) => {
            const on = tab === item.id
            return (
              <button
                key={item.id}
                className={`segmented-item${on ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        {state === 'loading' ? <div className="act-empty">{t`Loading…`}</div> : null}
        {state === 'error' ? (
          <div className="act-empty">
            {t`Failed to load records`}
            <button className="pf-link" type="button" onClick={() => void data.refetch()}>
              {t`Retry`}
            </button>
          </div>
        ) : null}
        {state === 'empty' ? <div className="act-empty">{t`No activity in this category`}</div> : null}
        {state === 'ready' ? (
          <div className="act-feed">
            {groups.map((group) => (
              <div className="act-group" key={group.label}>
                <div className="act-day-head">{group.label}</div>
                {group.items.map((row, idx) => {
                  const nav = getActivityNavigation(row.kind, 's-activity')
                  const view = getActivityListPresentation(row)
                  const clickable = nav.type !== 'none'
                  return clickable ? (
                    <button
                      className="act-row act-row--link"
                      type="button"
                      key={`${row.kind}-${row.ts}-${idx}`}
                      onClick={() => onOpen(row, nav)}
                    >
                      <span className="act-row-ic">
                        <UsdxIcon name={view.icon as TIconName} size={18} />
                      </span>
                      <span className="act-row-main">
                        <span className="act-row-title">{view.title}</span>
                      </span>
                      <span className="act-row-aside">
                        <span className={`act-row-amt ${view.amountPos ? 'pos' : 'neg'}`}>
                          {view.amount}
                        </span>
                        <span className="act-row-time-line">
                          <span className="act-row-time">{view.time}</span>
                          <UsdxIcon name="chevron-right" className="act-row-go" size={14} />
                        </span>
                      </span>
                    </button>
                  ) : (
                    <div className="act-row" key={`${row.kind}-${row.ts}-${idx}`}>
                      <span className="act-row-ic">
                        <UsdxIcon name={view.icon as TIconName} size={18} />
                      </span>
                      <span className="act-row-main">
                        <span className="act-row-title">{view.title}</span>
                      </span>
                      <span className="act-row-aside">
                        <span className={`act-row-amt ${view.amountPos ? 'pos' : 'neg'}`}>
                          {view.amount}
                        </span>
                        <span className="act-row-time-line">
                          <span className="act-row-time">{view.time}</span>
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ) : null}
        {data.hasMore ? (
          <button className="act-more" type="button" onClick={() => void data.loadMore()}>
            <span>{data.loadingMore ? t`Loading…` : t`Load more`}</span>
            <UsdxIcon name="chevron-down" />
          </button>
        ) : state === 'ready' ? (
          <div className="act-end">{t`All records loaded`}</div>
        ) : null}
      </div>
    </section>
  )
}
