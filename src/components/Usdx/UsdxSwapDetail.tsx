import { useEffect, useMemo, useRef } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'
import { useReadContract } from 'wagmi'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { useUsdxCancelSellAction } from '@/hooks/useUsdxCancelSellAction'
import { useUsdxClaimSellerAction } from '@/hooks/useUsdxClaimSellerAction'
import { buildSwapDetailInfoRows, getSwapActivityDetail } from '@/utils/usdx/activityViews'
import { SWAP_PRICE_LABEL } from '@/utils/usdx/swapQuote'
import { asSellOrderView, getSellOrderStatus } from '@/utils/usdx/orderViews'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { UsdxIcon } from './UsdxIcon'

type TActivity = ReturnType<typeof import('@/utils/usdx/activityViews').formatActivityRow>
type TSwapDetail = NonNullable<ReturnType<typeof getSwapActivityDetail>>

type TProps = {
  row: TActivity | null
  variant: 'screen' | 'sheet'
  onBack: () => void
  onClose?: () => void
  onCancelled?: () => void
}

const STATUS_ICON = {
  done: 'check-circle-2',
  queued: 'clock',
  cancelled: 'x-circle',
} as const

const useResolvedSwapDetail = (row: TActivity | null) => {
  const usdx = useUsdxConfig()
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const chainId = usdx?.chainId
  const needsOrderStatus = row != null && Number(row.kind) === 5 && row.mintId > 0n
  const needsFilledAt =
    row != null && (Number(row.kind) === 3 || Number(row.kind) === 5) && row.mintId > 0n
  const orderId = needsOrderStatus || needsFilledAt ? Number(row.mintId) : undefined
  const orderQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'sellOrder',
    args: orderId != null ? [orderId] : undefined,
    chainId,
    query: { enabled: Boolean(diamond && needsOrderStatus) },
  })
  const quoteQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'quoteOrder',
    args: orderId != null ? [orderId] : undefined,
    chainId,
    query: { enabled: Boolean(diamond && needsOrderStatus) },
  })
  const filledAtQuery = useReadContract({
    address: diamond,
    abi: usdxDiamondAbi,
    functionName: 'orderFilledAt',
    args: orderId != null ? [orderId] : undefined,
    chainId,
    query: { enabled: Boolean(diamond && needsFilledAt) },
  })

  if (!row) {
    return {
      detail: null as TSwapDetail | null,
      statusLoading: false,
      refetchOrder: orderQuery.refetch,
    }
  }

  const orderView =
    needsOrderStatus && orderQuery.data != null
      ? asSellOrderView(orderQuery.data, row.mintId)
      : null
  const orderStatus =
    needsOrderStatus && orderQuery.data != null ? getSellOrderStatus(orderQuery.data) : undefined
  const grossClaimable = quoteQuery.data?.[1]
  const detail = getSwapActivityDetail(row, {
    orderStatus: needsOrderStatus ? orderStatus : undefined,
    orderRemaining: orderView?.remaining,
    orderAmount: orderView?.amount,
    grossClaimable,
    filledAt: needsFilledAt ? filledAtQuery.data : undefined,
  })
  const statusLoading =
    (needsOrderStatus && (orderQuery.isLoading || orderQuery.isFetching || quoteQuery.isLoading)) ||
    (needsFilledAt && (filledAtQuery.isLoading || filledAtQuery.isFetching))

  const refetchOrder = async () => {
    await Promise.all([orderQuery.refetch(), quoteQuery.refetch(), filledAtQuery.refetch()])
  }

  return { detail, statusLoading, refetchOrder }
}

const DetailFields = ({ detail }: { detail: TSwapDetail }) => {
  const { i18n } = useLingui()
  const rows = useMemo(
    () => buildSwapDetailInfoRows(detail, SWAP_PRICE_LABEL),
    [detail, i18n.locale]
  )

  return (
    <div className="info-list">
      {rows.map(([label, value]) => (
        <div className="info-row" key={label}>
          <span className="info-label">{label}</span>
          <span className="info-value num">{value}</span>
        </div>
      ))}
    </div>
  )
}

const OrderActionButton = ({
  detail,
  onCancelled,
  onSettled,
}: {
  detail: TSwapDetail
  onCancelled?: () => void
  onSettled?: () => void
}) => {
  const { i18n } = useLingui()
  const { cancelSell, resolveCancelOutcome, submitting: cancelSubmitting, isSuccess: cancelSuccess, txHash: cancelHash, resetWrite: resetCancel } =
    useUsdxCancelSellAction()
  const { claimSellerUsdt, resolveClaimSuccessMessage, submitting: claimSubmitting, isSuccess: claimSuccess, txHash: claimHash, resetWrite: resetClaim } =
    useUsdxClaimSellerAction()
  const lastSuccessHash = useRef<string | null>(null)
  const submitting = cancelSubmitting || claimSubmitting
  const claimLabel = useMemo(
    () => (submitting ? t`Claiming…` : t`Claim USDT`),
    [i18n.locale, submitting]
  )
  const cancelLabel = useMemo(
    () => (submitting ? t`Cancelling…` : t`Cancel order`),
    [i18n.locale, submitting]
  )

  useEffect(() => {
    if (!cancelSuccess || !cancelHash) return
    const id = String(cancelHash)
    if (lastSuccessHash.current === id) return
    lastSuccessHash.current = id
    void (async () => {
      const message = await resolveCancelOutcome()
      showUsdxToastSuccess(message)
      resetCancel()
      await onSettled?.()
      onCancelled?.()
    })()
  }, [cancelSuccess, cancelHash, onCancelled, onSettled, resetCancel, resolveCancelOutcome])

  useEffect(() => {
    if (!claimSuccess || !claimHash) return
    const id = String(claimHash)
    if (lastSuccessHash.current === id) return
    lastSuccessHash.current = id
    void (async () => {
      showUsdxToastSuccess(resolveClaimSuccessMessage())
      resetClaim()
      await onSettled?.()
      onCancelled?.()
    })()
  }, [claimSuccess, claimHash, onCancelled, onSettled, resetClaim, resolveClaimSuccessMessage])

  if (detail.canClaim && detail.orderId != null) {
    const onClaim = async () => {
      try {
        await claimSellerUsdt(detail.orderId!)
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          const msg = getUsdxWriteErrorMessage(e, t`Claim failed, please try again`)
          showUsdxToastError(msg)
        }
      }
    }
    return (
      <button
        className="btn btn-primary btn-md btn-block"
        type="button"
        style={{ marginTop: 'var(--sp-16)' }}
        disabled={submitting}
        onClick={() => void onClaim()}
      >
        {claimLabel}
      </button>
    )
  }

  if (!detail.canCancel || detail.orderId == null) return null

  const onCancel = async () => {
    try {
      await cancelSell(detail.orderId!)
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = getUsdxWriteErrorMessage(e, t`Cancel failed, please try again`)
        showUsdxToastError(msg)
      }
    }
  }

  return (
    <button
      className="btn btn-outline btn-md btn-block"
      type="button"
      style={{ marginTop: 'var(--sp-16)' }}
      disabled={submitting}
      onClick={() => void onCancel()}
    >
      {cancelLabel}
    </button>
  )
}

const SwapDetailBody = ({
  detail,
  statusLoading,
  onCancelled,
  onSettled,
  showStatusBadge,
}: {
  detail: TSwapDetail
  statusLoading: boolean
  onCancelled?: () => void
  onSettled?: () => void
  showStatusBadge: boolean
}) => {
  const { i18n } = useLingui()
  const readingStatus = useMemo(() => t`Reading status…`, [i18n.locale])

  return (
    <>
      {showStatusBadge ? (
        <div className="spd-status">
          {statusLoading ? (
            <span className="spd-badge queued">{readingStatus}</span>
          ) : (
            <span className={`spd-badge ${detail.statusCls}`}>
              <UsdxIcon
                name={STATUS_ICON[detail.statusCls as keyof typeof STATUS_ICON]}
                size={16}
              />
              {detail.status}
            </span>
          )}
          <span className="spd-dir">{detail.dirLabel}</span>
        </div>
      ) : null}
      <div className={showStatusBadge ? 'card' : undefined}>
        <DetailFields detail={detail} />
      </div>
      {!statusLoading ? (
        <OrderActionButton detail={detail} onCancelled={onCancelled} onSettled={onSettled} />
      ) : null}
    </>
  )
}

export const UsdxSwapDetail = ({
  row,
  variant,
  onBack,
  onClose,
  onCancelled,
}: TProps) => {
  const { i18n } = useLingui()
  const closeAria = useMemo(() => t`Close`, [i18n.locale])
  const backAria = useMemo(() => t`Back`, [i18n.locale])
  const title = useMemo(() => t`Swap details`, [i18n.locale])
  const { detail, statusLoading, refetchOrder } = useResolvedSwapDetail(row)

  useEffect(() => {
    if (variant !== 'sheet') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, variant])

  if (variant === 'sheet') {
    if (!row || !detail) return null
    return (
      <div
        className="sheet-backdrop open"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose?.()
        }}
      >
        <div className="half-sheet" role="dialog" aria-modal="true" aria-labelledby="usdx-sd-title">
          <div className="half-sheet-grabber" />
          <div className="half-sheet-header">
            <div className="half-sheet-title" id="usdx-sd-title">
              {title}
            </div>
            <button className="half-sheet-close" type="button" aria-label={closeAria} onClick={onClose}>
              <UsdxIcon name="x" size={14} />
            </button>
          </div>
          <div className="half-sheet-body">
            <SwapDetailBody
              detail={detail}
              statusLoading={statusLoading}
              showStatusBadge={false}
              onCancelled={onCancelled}
              onSettled={() => void refetchOrder()}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="screen active" id="s-swap-detail" aria-label={title}>
      <div className="nav-bar">
        <button className="nav-side" type="button" aria-label={backAria} onClick={onBack}>
          <UsdxIcon name="chevron-left" />
        </button>
        <span className="nav-title">{title}</span>
        <span className="nav-side" />
      </div>
      <div className="screen-body">
        {row && detail ? (
          <SwapDetailBody
            detail={detail}
            statusLoading={statusLoading}
            showStatusBadge
            onCancelled={onCancelled}
            onSettled={() => void refetchOrder()}
          />
        ) : (
          <div className="act-empty">{t`Record not found`}</div>
        )}
      </div>
    </section>
  )
}
