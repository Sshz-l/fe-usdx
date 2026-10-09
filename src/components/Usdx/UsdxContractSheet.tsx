import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'
import { getUsdxTokenExplorerUrl } from '@/utils/usdx/contractViews'
import { UsdxIcon } from './UsdxIcon'

type TProps = {
  open: boolean
  address?: string
  iconSrc: string
  onClose: () => void
}

export const UsdxContractSheet = ({ open, address, iconSrc, onClose }: TProps) => {
  const { i18n } = useLingui()
  const closeAria = useMemo(() => t`Close`, [i18n.locale])
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number>(0)
  const explorerUrl = getUsdxTokenExplorerUrl(address)

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
      id="usdxContractSheet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="half-sheet" role="dialog" aria-modal="true" aria-labelledby="ucsTitle">
        <div className="half-sheet-grabber" />
        <div className="half-sheet-header">
          <div className="half-sheet-title" id="ucsTitle">
            {t`USDX contract`}
          </div>
          <button className="half-sheet-close" type="button" aria-label={closeAria} onClick={onClose}>
            <UsdxIcon name="x" size={14} />
          </button>
        </div>
        <div className="half-sheet-body">
          <div className="acct-head">
            <img className="avatar avatar-round avatar-40" src={iconSrc} alt="" aria-hidden="true" />
            <div className="acct-meta">
              <div className="acct-addr num">{address || '—'}</div>
              <div className="acct-net">{t`BNB Smart Chain`}</div>
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
              {t`View on BscScan`}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
