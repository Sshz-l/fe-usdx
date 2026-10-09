import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'

import { formatUsdxAmount } from '@/utils/usdx/homeViews'
import { getUsdxAddressExplorerUrl, shortUsdxAddr } from '@/utils/usdx/contractViews'
import { UsdxIcon } from './UsdxIcon'

type TProps = {
  open: boolean
  address?: string
  avatarUrl?: string
  walletName: string
  networkLabel: string
  networkWrong?: boolean
  usdxBalance: bigint
  onClose: () => void
  onDisconnect: () => void
}

const avatarLetter = (address?: string) =>
  address && address.length > 2 ? address.slice(2, 3).toUpperCase() : '0'

export const UsdxAccountSheet = ({
  open,
  address,
  avatarUrl,
  walletName,
  networkLabel,
  networkWrong = false,
  usdxBalance,
  onClose,
  onDisconnect,
}: TProps) => {
  const { i18n } = useLingui()
  const closeAria = useMemo(() => t`Close`, [i18n.locale])
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number>(0)
  const explorerUrl = getUsdxAddressExplorerUrl(address)

  useEffect(
    () => () => {
      window.clearTimeout(copiedTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onCopy = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
      showUsdxToastSuccess(t`Copied`)
    } catch (e) {
      console.error(e)
      showUsdxToastError(t`Copy failed`)
    }
  }

  return (
    <div
      className="sheet-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="half-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usdx-account-title"
      >
        <div className="half-sheet-grabber" />
        <div className="half-sheet-header">
          <div className="half-sheet-title" id="usdx-account-title">
            {t`My wallet`}
          </div>
          <button className="half-sheet-close" type="button" aria-label={closeAria} onClick={onClose}>
            <UsdxIcon name="x" size={14} />
          </button>
        </div>
        <div className="half-sheet-body">
          <div className="acct-head">
            {avatarUrl ? (
              <img className="avatar avatar-round avatar-40" src={avatarUrl} alt="" />
            ) : (
              <span className="avatar avatar-round avatar-40 tone-c" aria-hidden="true">
                {avatarLetter(address)}
              </span>
            )}
            <div className="acct-meta">
              <div className="acct-addr num">{shortUsdxAddr(address)}</div>
              <div className={`acct-net${networkWrong ? ' wrong' : ''}`}>{networkLabel}</div>
            </div>
          </div>
          <div
            className="info-list"
            style={{
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--r-8)',
              marginTop: 'var(--sp-12)',
            }}
          >
            <div className="info-row">
              <span className="info-label">{t`Wallet`}</span>
              <span className="info-value">{walletName || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`USDX balance`}</span>
              <span className="info-value num">{formatUsdxAmount(usdxBalance)}</span>
            </div>
          </div>
          <div className="acct-actions">
            <button
              className={`btn btn-tonal-neutral btn-md${copied ? ' done' : ''}`}
              type="button"
              onClick={() => void onCopy()}
            >
              <UsdxIcon name={copied ? 'copy-check' : 'copy'} />
              {t`Copy address`}
            </button>
            <a
              className="btn btn-tonal-neutral btn-md"
              href={explorerUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!explorerUrl}
              onClick={(e) => {
                if (!explorerUrl) e.preventDefault()
              }}
            >
              <UsdxIcon name="external-link" />
              {t`Block explorer`}
            </a>
          </div>
        </div>
        <div className="half-sheet-footer">
          <button className="btn btn-danger btn-lg btn-block" type="button" onClick={onDisconnect}>
            {t`Disconnect`}
          </button>
        </div>
      </div>
    </div>
  )
}
