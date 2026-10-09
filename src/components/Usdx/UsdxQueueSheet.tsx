import { useEffect, useMemo } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { formatHangOrderAmount, mapSellOrder } from '@/utils/usdx/orderViews'
import { UsdxIcon } from './UsdxIcon'

type TOrder = {
  orderId: bigint
  amount: bigint
  remaining: bigint
  createAt: bigint
  status: number
}

type TProps = {
  open: boolean
  /** 进行中挂单（activeSellOrdersOf） */
  orders: TOrder[]
  loading?: boolean
  error?: Error | null
  hasMore?: boolean
  cancellingId?: string | null
  onClose: () => void
  onCancel: (orderId: bigint) => void
  onRetry?: () => void
  onLoadMore?: () => void
}

/** 与设计稿一致：YYYY-MM-DD */
const formatOrderDate = (ts: bigint) => {
  if (!ts) return '—'
  const d = new Date(Number(ts) * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const UsdxQueueSheet = ({
  open,
  orders,
  loading = false,
  error = null,
  hasMore = false,
  cancellingId = null,
  onClose,
  onCancel,
  onRetry,
  onLoadMore,
}: TProps) => {
  const { i18n } = useLingui()
  const closeAria = useMemo(() => t`Close`, [i18n.locale])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="sheet-backdrop open"
      id="usdx-queue-sheet"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="half-sheet" role="dialog" aria-modal="true" aria-labelledby="usdx-queue-title">
        <div className="half-sheet-grabber" />
        <div className="half-sheet-header">
          <div className="half-sheet-title" id="usdx-queue-title">
            {t`My open orders`}
          </div>
          <button className="half-sheet-close" type="button" aria-label={closeAria} onClick={onClose}>
            <UsdxIcon name="x" size={14} />
          </button>
        </div>
        <div className="half-sheet-body">
          {error ? (
            <div className="queue-empty">
              <div>{t`Failed to load open orders, please refresh and retry`}</div>
              <button className="pf-link" type="button" onClick={onRetry}>
                {t`Retry`}
              </button>
            </div>
          ) : loading && orders.length === 0 ? (
            <div className="queue-empty">{t`Loading…`}</div>
          ) : orders.length === 0 ? (
            <div className="queue-empty">{t`No open orders`}</div>
          ) : (
            orders.map((order, index) => {
              const view = mapSellOrder(order)
              const id = view.orderId.toString()
              const busy = cancellingId === id
              return (
                <div className="queue-row" key={id}>
                  <span className="queue-idx">#{index + 1}</span>
                  <span className="queue-date">{formatOrderDate(view.createAt)}</span>
                  <div className="queue-main">
                    <span className="queue-amt num">
                      {formatHangOrderAmount(view.displayAmount)} USDX
                    </span>
                    <span className="queue-sub num">
                      {t`Filled ${formatHangOrderAmount(view.filled)}`}
                    </span>
                  </div>
                  <button
                    className="queue-cancel"
                    type="button"
                    disabled={busy}
                    onClick={() => onCancel(view.orderId)}
                  >
                    {busy ? t`Cancelling…` : t`Cancel`}
                  </button>
                </div>
              )
            })
          )}
          {hasMore ? (
            <button className="act-more" type="button" onClick={onLoadMore}>
              <span>{t`Load more`}</span>
              <UsdxIcon name="chevron-down" size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
