import { useEffect, useMemo } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { UsdxIcon } from './UsdxIcon'

export type TTxConfirmRow = {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}

export type TTxFlowStep = {
  id: string
  label: string
  flag: 'todo' | 'prep' | 'wait' | 'skip' | 'done' | 'fail'
  status: string
}

type TProps = {
  open: boolean
  title: string
  confirmLabel: string
  confirmLoading?: boolean
  confirmDisabled?: boolean
  paySectionLabel: string
  getSectionLabel: string
  payRows: TTxConfirmRow[]
  getRows: TTxConfirmRow[]
  progressOpen?: boolean
  progressSteps?: TTxFlowStep[]
  onClose: () => void
  onConfirm: () => void
}

const toneClass = (tone?: TTxConfirmRow['tone']) => {
  if (tone === 'pos') return ' pos'
  if (tone === 'neg') return ' neg'
  return ''
}

const StepIcon = ({ flag }: { flag: TTxFlowStep['flag'] }) => {
  if (flag === 'prep' || flag === 'wait') return <span className="txs-spin" />
  if (flag === 'fail') return <UsdxIcon name="x" size={12} />
  if (flag === 'todo') return <UsdxIcon name="circle" size={12} />
  return <UsdxIcon name="check" size={12} />
}

export const UsdxTxConfirmSheet = ({
  open,
  title,
  confirmLabel,
  confirmLoading = false,
  confirmDisabled = false,
  paySectionLabel,
  getSectionLabel,
  payRows,
  getRows,
  progressOpen = false,
  progressSteps = [],
  onClose,
  onConfirm,
}: TProps) => {
  const { i18n } = useLingui()
  const closeAria = useMemo(() => t`Close`, [i18n.locale])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={`sheet-backdrop tx-confirm-sheet${open ? ' open' : ''}`}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="half-sheet" role="dialog" aria-modal="true" aria-labelledby="usdx-txc-title">
        <div className="half-sheet-grabber" />
        <div className="half-sheet-header">
          <div className="half-sheet-title" id="usdx-txc-title">
            {title}
          </div>
          <button className="half-sheet-close" type="button" aria-label={closeAria} onClick={onClose}>
            <UsdxIcon name="x" />
          </button>
        </div>
        <div className="half-sheet-body">
          <div id="txcReview" aria-hidden={progressOpen}>
            <div className="sheet-sec">{paySectionLabel}</div>
            <div
              className="info-list"
              style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--r-8)' }}
            >
              {payRows.map((row) => (
                <div className="info-row" key={row.label}>
                  <span className="info-label">{row.label}</span>
                  <span className={`info-value num${toneClass(row.tone)}`}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="sheet-sec">{getSectionLabel}</div>
            <div
              className="info-list"
              style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--r-8)' }}
            >
              {getRows.map((row) => (
                <div className="info-row" key={row.label}>
                  <span className="info-label">{row.label}</span>
                  <span className={`info-value num${toneClass(row.tone)}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          {progressOpen ? (
            <div className="txc-progress" id="txcProgress">
              <div className="tx-steps">
                {progressSteps.map((step, index) => (
                  <div
                    className={`tx-step is-${step.flag}`}
                    key={step.id}
                    style={{ ['--i' as string]: index }}
                  >
                    <span className="txs-ic">
                      <StepIcon flag={step.flag} />
                    </span>
                    <span className="txs-label">{step.label}</span>
                    <span className="txs-state">{step.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="half-sheet-footer">
          <button
            className={`sheet-primary${confirmLoading ? ' is-loading' : ''}`}
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLoading ? <span className="btn-spinner" style={{ width: 14, height: 14 }} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
