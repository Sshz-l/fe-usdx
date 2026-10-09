import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccessAfterNav } from '@/constants/usdxToast'
import { useAccount } from 'wagmi'

import { formatUsdxAmount, formatUsdxUsd } from '@/utils/usdx/homeViews'
import { formatTokenAmountFixed, parseTokenAmount } from '@/utils/usdx/amounts'
import {
  getRedeemDisplay,
  getRedeemMax,
  getRedeemSubmitGate,
  formatRedeemSuccessMessage,
} from '@/utils/usdx/redeemViews'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import { useUsdxRedeemAction, useUsdxRedeemQuote } from '@/hooks/useUsdxRedeemAction'
import { UsdxExplainSheet } from './UsdxExplainSheet'
import { UsdxIcon } from './UsdxIcon'
import { UsdxTokenIcon } from './UsdxTokenIcon'
import { UsdxTxConfirmSheet, type TTxConfirmRow } from './UsdxTxConfirmSheet'

type THero = ReturnType<typeof import('@/utils/usdx/homeViews').getHomeHero>

type TProps = {
  hero: THero
  pauseRedeem: boolean
  /** 协议 BOX 标记价是否可用；无报价时控制总价值行 / 无价提示 */
  priceOk?: boolean
  pauseLoading?: boolean
  pauseError?: boolean
  userLoading?: boolean
  userError?: boolean
  treasury?: bigint | null
  active?: boolean
  onConnect: () => void
  onNavigateAfterSuccess: () => void
  onSuccess?: () => void | Promise<void>
}

export const UsdxRedeem = ({
  hero,
  pauseRedeem,
  priceOk = true,
  pauseLoading = false,
  pauseError = false,
  userLoading = false,
  userError = false,
  treasury = null,
  active = true,
  onConnect,
  onNavigateAfterSuccess,
  onSuccess,
}: TProps) => {
  const { i18n } = useLingui()
  const { isConnected, chainId } = useAccount()
  const usdx = useUsdxConfig()
  const targetChainId = usdx?.chainId
  const [raw, setRaw] = useState('')
  const [pct, setPct] = useState(0)
  const [explainOpen, setExplainOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const parsed = parseTokenAmount(raw)
  const amount = parsed.ok ? parsed.amount : 0n
  const wallet = getRedeemMax(hero)
  const { quote, loading: quoteLoading, error: quoteError } = useUsdxRedeemQuote(amount)
  const { redeem, submitting, txHash, isSuccess, resetWrite } = useUsdxRedeemAction()
  const lastSuccessHash = useRef<string | null>(null)
  const display = useMemo(
    () => getRedeemDisplay(amount > 0n ? quote : null, { amount, priceOk }),
    [amount, i18n.locale, priceOk, quote]
  )
  const gate = getRedeemSubmitGate({ pauseRedeem, amount, wallet })
  const totalValueText =
    display.totalValue == null ? '—' : `${formatUsdxAmount(display.totalValue, 2)} USDT`
  const redeemExplain = useMemo(
    () => ({
      title: t`About redeeming`,
      points: [
        {
          label: t`Payout`,
          text: (
            <Trans>
              USDX is fully burned; the treasury pays equivalent <b>USDT + BOX</b>.
            </Trans>
          ),
        },
        {
          label: t`Normal mode`,
          text: (
            <Trans>
              When the treasury can cover face value, redeem at <b>1:1 face value</b> with a 0.5%
              redeem fee.
            </Trans>
          ),
        },
        {
          label: t`Discount mode`,
          text: (
            <Trans>
              When the treasury is short, pay <b>pro rata at NAV</b>, same 0.5% redeem fee. The
              discount factor makes your proceeds below your share, so remaining USDX backing
              thickens.
            </Trans>
          ),
        },
      ] as { label: string; text: ReactNode }[],
    }),
    [i18n.locale]
  )

  let err = ''
  if (raw) {
    if (!parsed.ok) err = t`Please enter a valid amount`
    else if (!isConnected) err = t`Please connect your wallet`
    else if (targetChainId && chainId !== targetChainId) err = t`Please switch to BNB Smart Chain`
    else if (userLoading) err = ''
    else if (userError) err = t`Failed to read USDX balance, please refresh and retry`
    else if (gate === 'over')
      err = t`Insufficient USDX balance, max redeem ${formatUsdxAmount(wallet)}`
    else if (pauseLoading) err = ''
    else if (pauseError) err = t`Failed to read protocol status, please refresh`
    else if (gate === 'pause') err = t`Redeeming paused`
    else if (quoteLoading) err = ''
    else if (quoteError) err = t`Failed to fetch redeem quote, please try again`
  }

  const canSubmit =
    parsed.ok &&
    amount > 0n &&
    !err &&
    !gate &&
    !quoteLoading &&
    !pauseError &&
    Boolean(quote) &&
    isConnected &&
    chainId === targetChainId &&
    !submitting

  const confirmPayRows = useMemo(
    (): TTxConfirmRow[] => [{ label: 'USDX', value: formatUsdxAmount(amount, 2) }],
    [amount]
  )
  const confirmGetRows = useMemo(
    (): TTxConfirmRow[] =>
      display.rows.map((row) => ({
        label: row.sym,
        /* 与 HTML openTxConfirm(redeem) / 截图一致：USDT、BOX 均两位小数 */
        value: formatUsdxAmount(row.amount, 2),
      })),
    [display.rows]
  )

  useEffect(() => {
    if (!isSuccess || !txHash) return
    const hash = String(txHash)
    if (lastSuccessHash.current === hash) return
    lastSuccessHash.current = hash
    void (async () => {
      const message = quote ? formatRedeemSuccessMessage(quote) : t`Redeem successful`
      await onSuccess?.()
      setRaw('')
      setPct(0)
      setConfirmOpen(false)
      resetWrite()
      onNavigateAfterSuccess()
      showUsdxToastSuccessAfterNav(message, { autoClose: 3500 })
    })()
  }, [isSuccess, txHash, onSuccess, onNavigateAfterSuccess, quote, resetWrite, i18n.locale])

  const onSlider = (next: number) => {
    setPct(next)
    const nextAmount = (wallet * BigInt(next)) / 100n
    setRaw(next > 0 ? formatTokenAmountFixed(nextAmount, 2) : '')
  }

  const onClick = () => {
    if (!isConnected) {
      onConnect()
      return
    }
    if (!canSubmit || submitting) return
    setConfirmOpen(true)
  }

  const onConfirm = async () => {
    setConfirmOpen(false)
    try {
      await redeem(raw)
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = getUsdxWriteErrorMessage(e, t`Redeem failed, please try again`)
        showUsdxToastError(msg)
      }
    }
  }

  return (
    <section
      className={`screen screen--tab${active ? ' active' : ''}`}
      id="s-redeem"
      aria-label={t`Redeem USDX`}
      aria-hidden={!active}
    >
      <div className="screen-body">
        <div className="amt-block" id="rdBox">
          <div className="amt-head">
            <span className="amt-label">
              {t`Redeem amount`}
              <button
                className="q-tip"
                type="button"
                aria-label={t`About redeeming`}
                onClick={() => setExplainOpen(true)}
              >
                <UsdxIcon name="help-circle" />
              </button>
            </span>
            <div className="sc-slider">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                aria-label={t`Redeem ratio`}
                onChange={(e) => onSlider(Number(e.target.value))}
                disabled={wallet <= 0n}
              />
              <span className={`sc-slider-label${pct === 0 ? ' empty' : ''}`}>
                {pct > 0 ? `${pct}%` : ''}
              </span>
            </div>
          </div>
          <div className="amt-big-row">
            <input
              className="amt-big-input"
              inputMode="decimal"
              placeholder="0"
              aria-label={t`USDX amount to redeem`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              disabled={submitting}
            />
          </div>
          {err ? (
            <div className="amt-err">
              <UsdxIcon name="alert-circle" />
              <span>{err}</span>
            </div>
          ) : null}
          <span className="amt-avail">
            <UsdxIcon name="wallet" />
            <span className="num">{formatUsdxAmount(wallet, 2)}</span> USDX
          </span>
        </div>

        <div className="card" id="rdGainCard">
          <div className="amt-result-label">{t`You will receive`}</div>
          <div className="amt-token-list">
            {display.rows.map((row) => (
              <div className="token-pill" key={row.sym}>
                <UsdxTokenIcon sym={row.sym as 'USDT' | 'BOX'} />
                <span className="tp-body">
                  <span className="tp-sym">{row.sym}</span>
                  <span className="tp-qty num">
                    {quoteLoading && amount > 0n
                      ? '…'
                      : formatUsdxAmount(row.amount, row.sym === 'BOX' ? 3 : 2)}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="info-list" style={{ marginTop: 'var(--sp-8)' }}>
            <div className="info-row" hidden={!display.showTotalValue}>
              <span className="info-label">{t`Total value`}</span>
              <span className="info-value num">{totalValueText}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{display.feeLabel}</span>
              <span className="info-value">{display.feeText}</span>
            </div>
          </div>
          <div
            className="empty-hint"
            hidden={!display.showNoPriceHint}
            style={{ padding: 0, fontSize: 'var(--fs-12)' }}
          >
            {t`No valid price; showing quantity only, no valuation.`}
          </div>
          <div className="pc-rows">
            <div className="pc-row">
              <span>{t`Treasury TVL`}</span>
              <b>{formatUsdxUsd(treasury)}</b>
            </div>
          </div>
        </div>

        <div className="cta-bar cta-bar--inline">
          <button
            className={`btn btn-primary btn-xl btn-block${submitting ? ' is-loading' : ''}`}
            type="button"
            disabled={!submitting && !canSubmit && isConnected}
            onClick={() => onClick()}
          >
            {submitting ? (
              <>
                <span className="btn-spinner" aria-hidden />
                {t`Confirming…`}
              </>
            ) : !isConnected ? (
              t`Connect Wallet`
            ) : (
              t`Redeem`
            )}
          </button>
        </div>
      </div>

      <UsdxTxConfirmSheet
        open={confirmOpen}
        title={t`Confirm redeem`}
        confirmLabel={t`Confirm redeem`}
        paySectionLabel={t`You redeem`}
        getSectionLabel={t`You receive`}
        payRows={confirmPayRows}
        getRows={confirmGetRows}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void onConfirm()}
      />
      <UsdxExplainSheet
        open={explainOpen}
        title={redeemExplain.title}
        points={redeemExplain.points}
        onClose={() => setExplainOpen(false)}
      />
    </section>
  )
}
