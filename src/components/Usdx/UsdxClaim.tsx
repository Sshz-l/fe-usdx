import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'
import { formatUsdxAmount, formatUsdxPct, formatUsdxReleaseAmount } from '@/utils/usdx/homeViews'
import { formatClaimSuccessMessage, getClaimSummary } from '@/utils/usdx/claimViews'
import {
  formatReleaseBarWidth,
  getAggregateReleaseBarProgress,
  getAggregateReleaseProgress,
  getPositionDetail,
} from '@/utils/usdx/positionViews'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { useUsdxClaimAction } from '@/hooks/useUsdxClaimAction'
import type { useUsdxPositions } from '@/hooks/useUsdxPositions'
import { UsdxExplainSheet } from './UsdxExplainSheet'
import { UsdxIcon } from './UsdxIcon'

type TProps = {
  positions: ReturnType<typeof useUsdxPositions>
  pauseRelease: boolean
  pauseLoading?: boolean
  pauseError?: boolean
  onBack: () => void
  onGo: (screen: string) => void
  onOpenPlan: (mintId: bigint) => void
  onClaimSuccess: () => Promise<unknown>
}

export const UsdxClaim = ({
  positions,
  pauseRelease,
  pauseLoading = false,
  pauseError = false,
  onBack,
  onGo,
  onOpenPlan,
  onClaimSuccess,
}: TProps) => {
  const { i18n } = useLingui()
  const [explainOpen, setExplainOpen] = useState(false)
  const { releaseAll, submitting, txHash, isSuccess, resetWrite } = useUsdxClaimAction()
  const lastSuccessHash = useRef<string | null>(null)
  const pendingClaimWei = useRef(0n)
  const s = getClaimSummary(positions.aggregate)
  const progress = getAggregateReleaseProgress(positions.list)
  const barProgress = getAggregateReleaseBarProgress(positions.list)
  const hasList = positions.list.length > 0
  const showEmpty = !positions.loading && !hasList && !positions.aggregateLoading && !s.hasPlan
  const dailyExplain = useMemo(
    () => ({
      title: t`Release rules`,
      points: [
        {
          label: t`Daily release`,
          text: (
            <Trans>
              Initial lock × <b>0.3%</b>, fixed each day.
            </Trans>
          ),
        },
        { label: t`Period`, text: t`333 equal days, remainder on day 334, 100% in total.` },
        {
          label: t`Multiple mints`,
          text: (
            <Trans>
              Each mint is independent; amounts due but unclaimed <b>are not voided</b>.
            </Trans>
          ),
        },
      ] as { label: string; text: ReactNode }[],
    }),
    [i18n.locale]
  )

  useEffect(() => {
    if (!isSuccess || !txHash) return
    const hash = String(txHash)
    if (lastSuccessHash.current === hash) return
    lastSuccessHash.current = hash
    void (async () => {
      await onClaimSuccess()
      showUsdxToastSuccess(formatClaimSuccessMessage(pendingClaimWei.current))
      resetWrite()
    })()
  }, [isSuccess, txHash, onClaimSuccess, resetWrite])

  const onClaimAll = async () => {
    if (pauseRelease || pauseLoading || pauseError || !s.canClaim || submitting) return
    pendingClaimWei.current = s.claimableWei
    try {
      await releaseAll()
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = getUsdxWriteErrorMessage(e, t`Claim failed, please try again`)
        showUsdxToastError(msg)
      }
    }
  }

  const ctaLabel = pauseError || pauseLoading
    ? t`Reading protocol status…`
    : pauseRelease
      ? t`Claiming paused`
      : submitting
        ? t`Confirming…`
        : s.canClaim
          ? t`Claim all`
          : t`Nothing to claim`

  return (
    <section className="screen active" id="s-claim" aria-label={t`My release plans`}>
      <div className="nav-bar">
        <button className="nav-side" type="button" aria-label={t`Back`} onClick={onBack}>
          <UsdxIcon name="chevron-left" />
        </button>
        <span className="nav-title">{t`My release plans`}</span>
        <span className="nav-side">
          <button
            className="icon-btn"
            type="button"
            aria-label={t`About release rules`}
            onClick={() => setExplainOpen(true)}
          >
            <UsdxIcon name="help-circle" />
          </button>
        </span>
      </div>
      <div className="screen-body">
        {positions.error && !hasList ? (
          <div className="home-empty">
            <div className="empty-heading">{t`Failed to load positions`}</div>
            <button className="btn btn-primary btn-md" type="button" onClick={() => void positions.refetch()}>
              {t`Retry`}
            </button>
          </div>
        ) : null}
        {pauseError ? (
          <div className="home-empty compact">
            <div className="empty-heading">{t`Failed to read protocol status`}</div>
            <div className="empty-desc">{t`Please refresh and retry`}</div>
          </div>
        ) : null}

        <div className="card" hidden={showEmpty || (!s.hasPlan && !positions.aggregateLoading && !hasList)}>
          <div className="claim-hero">
            <div className="ch-label">{t`Claimable`}</div>
            <div className="ch-amt">
              <span className="num">
                {positions.aggregateLoading
                  ? '…'
                  : formatUsdxReleaseAmount(positions.aggregate?.claimable ?? 0n)}
              </span>
              <span className="ch-cur">USDX</span>
            </div>
          </div>
          {positions.error && hasList ? (
            <div className="side-note" style={{ padding: '0 var(--sp-18) var(--sp-12)' }}>
              {t`Full aggregate failed; showing loaded batches`}
              <button className="pf-link" type="button" onClick={() => void positions.refetch()}>
                {t`Retry`}
              </button>
            </div>
          ) : null}
          <div style={{ padding: 'var(--sp-12) var(--sp-18) var(--sp-4)' }}>
            <button
              className="btn btn-primary btn-lg btn-block"
              type="button"
              disabled={
                pauseRelease || pauseLoading || pauseError || !s.canClaim || submitting || positions.aggregateLoading
              }
              onClick={() => void onClaimAll()}
            >
              {ctaLabel}
            </button>
          </div>
          <div style={{ padding: 'var(--sp-14) var(--sp-18) 0' }}>
            <div className="rel-track">
              <div className="rel-fill" style={{ width: formatReleaseBarWidth(barProgress) }} />
            </div>
            <div className="rel-legend">
              <span>
                {positions.aggregateLoading
                  ? t`Released —`
                  : t`Released ${formatUsdxPct(progress)}`}
              </span>
            </div>
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">{t`Pending unlock`}</span>
              <span className="info-value">
                {positions.aggregateLoading ? '—' : `${formatUsdxAmount(s.remainingLock)} USDX`}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Daily release total`}</span>
              <span className="info-value">
                {positions.aggregateLoading
                  ? '—'
                  : t`${formatUsdxReleaseAmount(positions.aggregate?.daily ?? 0n)} USDX / day`}
              </span>
            </div>
          </div>
        </div>

        <div className="sec-title" hidden={!hasList}>
          {t`Releasing batches`}
          <span>{t`${positions.positions.length} batches`}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-10)' }}>
          {positions.list.map((item, index) => {
            const detail = getPositionDetail(item)
            return (
              <button
                className="plan-card"
                type="button"
                key={item.mintId.toString()}
                onClick={() => onOpenPlan(item.mintId)}
              >
                <span className="pc-head">
                  <span className="pc-text">
                    <div className="pc-title">
                      {t`#${index + 1}　Mint ${formatUsdxAmount(item.totalUSDX ?? (item.depositD * 6n) / 5n)} USDX`}
                    </div>
                    <div className="pc-sub">
                      {t`Daily ${formatUsdxReleaseAmount(item.daily)}`} ·{' '}
                      {detail.remainingDays != null && detail.remainingDays > 0
                        ? t`${detail.remainingDays} days left`
                        : t`Fully released`}
                    </div>
                  </span>
                  <span className="pc-aside">
                    <div className="pc-aside-label">{t`Claimable`}</div>
                    <div className={`pc-aside-value${item.claimableAmount > 0n ? '' : ' zero'}`}>
                      {formatUsdxReleaseAmount(item.claimableAmount)}
                    </div>
                  </span>
                </span>
                <span className="rel-track">
                  <span className="rel-fill" style={{ width: formatReleaseBarWidth(detail.barProgress) }} />
                </span>
              </button>
            )
          })}
        </div>
        {positions.hasMore ? (
          <button className="act-more" type="button" onClick={positions.loadMore}>
            <span>{t`Load more`}</span>
            <UsdxIcon name="chevron-down" />
          </button>
        ) : null}

        <div className="home-empty" hidden={!showEmpty}>
          <div className="empty-illustration">
            <UsdxIcon name="layers" />
          </div>
          <div className="empty-heading">{t`No release plans yet`}</div>
          <div className="empty-desc">{t`After minting, 100% of credit is released at a fixed daily rate`}</div>
          <button
            className="btn btn-primary btn-md"
            type="button"
            style={{ marginTop: 'var(--sp-14)' }}
            onClick={() => onGo('s-mint')}
          >
            {t`Go mint`}
          </button>
        </div>
      </div>

      <UsdxExplainSheet
        open={explainOpen}
        title={dailyExplain.title}
        points={dailyExplain.points}
        onClose={() => setExplainOpen(false)}
      />
    </section>
  )
}
