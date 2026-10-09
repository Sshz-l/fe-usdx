import { useEffect, useMemo, type ReactNode } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { UsdxIcon } from './UsdxIcon'

type TPoint = {
  label: string
  text: ReactNode
}

type TProps = {
  open: boolean
  title: string
  points: TPoint[]
  onClose: () => void
}

export const UsdxExplainSheet = ({ open, title, points, onClose }: TProps) => {
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
      className={`sheet-backdrop${open ? ' open' : ''}`}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="half-sheet" role="dialog" aria-modal="true" aria-labelledby="usdx-explain-title">
        <div className="half-sheet-grabber" />
        <div className="half-sheet-header">
          <div className="half-sheet-title" id="usdx-explain-title">
            {title}
          </div>
          <button className="half-sheet-close" type="button" aria-label={closeAria} onClick={onClose}>
            <UsdxIcon name="x" />
          </button>
        </div>
        <div className="half-sheet-body">
          <div className="ex-points">
            {points.map((point) => (
              <div className="ex-point" key={point.label}>
                <span className="ex-pt-label">{point.label}</span>
                <span className="ex-pt-text">{point.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
