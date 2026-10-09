import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'
import { formatClaimSuccessMessage } from '@/utils/usdx/claimViews'
import { formatUsdxAmount, formatUsdxPct, formatUsdxReleaseAmount } from '@/utils/usdx/homeViews'
import {
  formatReleaseBarWidth,
  getPlanPresentation,
} from '@/utils/usdx/positionViews'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { useUsdxClaimAction } from '@/hooks/useUsdxClaimAction'
import type { useUsdxPositions } from '@/hooks/useUsdxPositions'
import { UsdxIcon } from './UsdxIcon'

type TProps = {
  mintId: bigint | null
  positions: ReturnType<typeof useUsdxPositions>
  pauseRelease: boolean
  pauseLoading?: boolean
  pauseError?: boolean
  /** protocolView.P，用于「总投入价值」拆成 USDT + BOX */
  boxPriceWad?: bigint | null
  onBack: () => void
  onClaimSuccess: () => Promise<unknown>
}

export const UsdxPlan = ({
  mintId,
  positions,
  pauseRelease,
  pauseLoading = false,
  pauseError = false,
  boxPriceWad = null,
  onBack,
  onClaimSuccess,
}: TProps) => {
  const { i18n } = useLingui()
  const { releaseOne, submitting, txHash, isSuccess, resetWrite } = useUsdxClaimAction()
  const lastSuccessHash = useRef<string | null>(null)
  const pendingClaimWei = useRef(0n)
  const [resolveAttempted, setResolveAttempted] = useState(false)
  const position = useMemo(
    () => positions.positions.find((item) => mintId != null && item.mintId === mintId) || null,
    [mintId, positions.positions]
  )

  useEffect(() => {
    setResolveAttempted(false)
  }, [mintId])

  useEffect(() => {
    if (mintId == null || position != null) return
    if (positions.loading || positions.aggregateLoading) return
    if (resolveAttempted) return
    setResolveAttempted(true)
    void positions.refetch()
  }, [
    mintId,
    position,
    positions.aggregateLoading,
    positions.loading,
    positions.refetch,
    resolveAttempted,
  ])
  const plan = useMemo(
    () => getPlanPresentation(position, { boxPriceWad }),
    [boxPriceWad, i18n.locale, position]
  )
  const index =
    position == null ? -1 : positions.positions.findIndex((item) => item.mintId === position.mintId)
  const claimable = plan.claimable
  const canClaim =
    !pauseRelease && !pauseLoading && !pauseError && Boolean(position) && claimable > 0n && !submitting
  const loading =
    mintId != null &&
    !position &&
    (!resolveAttempted || positions.loading || positions.aggregateLoading)
  const missingMint =
    mintId != null &&
    !position &&
    resolveAttempted &&
    !positions.loading &&
    !positions.aggregateLoading
  const pick = (ready: string) => (position ? ready : loading ? '…' : '—')
  const navTitle = useMemo(
    () => (index >= 0 ? t`#${index + 1} mint details` : t`Release plan details`),
    [i18n.locale, index]
  )
  const ctaLabel = submitting
    ? t`Confirming…`
    : loading
      ? t`Loading`
      : pauseLoading || pauseError
        ? t`Reading protocol status…`
        : pauseRelease
          ? t`Claiming paused`
          : claimable > 0n
            ? t`Claim`
            : t`Nothing to claim`

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

  const onClaim = async () => {
    if (!position || !canClaim) return
    pendingClaimWei.current = claimable
    try {
      await releaseOne(position.mintId)
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = getUsdxWriteErrorMessage(e, t`Claim failed, please try again`)
        showUsdxToastError(msg)
      }
    }
  }

  return (
    <section className="screen active" id="s-plan" aria-label={t`Release plan details`}>
      <div className="nav-bar">
        <button className="nav-side" type="button" aria-label={t`Back`} onClick={onBack}>
          <UsdxIcon name="chevron-left" />
        </button>
        <span className="nav-title">{navTitle}</span>
        <span className="nav-side" />
      </div>
      <div className="screen-body">
        {mintId == null || missingMint ? (
          <div className="home-empty compact">
            <div className="empty-desc">
              {mintId == null
                ? t`Open this page from a release plan or mint record`
                : t`Mint batch not found`}
            </div>
            <button
              className="btn btn-primary btn-md"
              type="button"
              style={{ marginTop: 'var(--sp-14)' }}
              onClick={onBack}
            >
              {t`Back`}
            </button>
          </div>
        ) : null}

        <div className="card" hidden={mintId == null || missingMint}>
          <div className="claim-hero">
            <div className="ch-label">{t`Claimable this batch`}</div>
            <div className="ch-amt">
              <span className="num">{pick(formatUsdxReleaseAmount(claimable))}</span>
              <span className="ch-cur">USDX</span>
            </div>
          </div>
          <div style={{ padding: 'var(--sp-12) var(--sp-18) var(--sp-16)' }}>
            <button
              className={`btn btn-primary btn-lg btn-block${submitting ? ' is-loading' : ''}`}
              type="button"
              disabled={loading || pauseLoading || pauseError || (!canClaim && !submitting)}
              onClick={() => void onClaim()}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden />
                  {ctaLabel}
                </>
              ) : (
                ctaLabel
              )}
            </button>
          </div>
          <div style={{ padding: '0 var(--sp-18) var(--sp-16)' }}>
            <div className="rel-track">
              <div
                className="rel-fill"
                style={{ width: formatReleaseBarWidth(plan.barProgress) }}
              />
            </div>
            <div className="rel-legend">
              <span>
                {t`Released ${position ? formatUsdxPct(plan.progress) : pick('—')}`}
              </span>
              <span>{loading ? '…' : plan.dayProgressLabel}</span>
            </div>
          </div>
        </div>

        <div className="card" hidden={mintId == null || missingMint}>
          <div className="card-title" style={{ padding: 'var(--sp-16) var(--sp-18) 0' }}>
            {t`Credit details`}
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">{t`Mint date`}</span>
              <span className="info-value">{loading ? '…' : plan.startDate}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Total deposit value`}</span>
              <span className="info-value num">{loading ? '…' : plan.depositSplit}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`This mint`}</span>
              <span className="info-value num">{pick(`${formatUsdxAmount(plan.minted, 2)} USDX`)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Total released`}</span>
              <span className="info-value num">
                {pick(`${formatUsdxReleaseAmount(plan.releasedTotal)} USDX`)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Remaining pending unlock`}</span>
              <span className="info-value num">
                {pick(`${formatUsdxAmount(plan.remainingLock, 2)} USDX`)}
              </span>
            </div>
          </div>
        </div>

        <div className="card" hidden={mintId == null || missingMint}>
          <div className="card-title" style={{ padding: 'var(--sp-16) var(--sp-18) 0' }}>
            {t`Time progress`}
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">{t`Daily release`}</span>
              <span className="info-value num">
                {pick(t`${formatUsdxReleaseAmount(plan.daily)} USDX / day`)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Days elapsed`}</span>
              <span className="info-value">
                {loading ? '…' : plan.elapsed == null ? '—' : t`${plan.elapsed} days`}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Days remaining`}</span>
              <span className="info-value">{loading ? '…' : plan.remainingDaysLabel}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Fully released on`}</span>
              <span className="info-value">{loading ? '…' : plan.endDate}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
