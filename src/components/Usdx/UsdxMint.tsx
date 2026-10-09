import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { showUsdxToastError, showUsdxToastSuccessAfterNav } from '@/constants/usdxToast'
import { useDebouncedValue, USDX_CHAIN_QUOTE_DEBOUNCE_MS } from '@/hooks/useDebouncedValue'
import { useAccount } from 'wagmi'

import { formatUsdxAmount, formatUsdxMoney, formatUsdxPct, formatUsdxReleaseAmount, getMintUnavailableReason } from '@/utils/usdx/homeViews'
import { getMintQuoteDisplay, isMintQuoteAmountSynced } from '@/utils/usdx/chainViews'
import {
  useUsdxBoxBalance,
  useUsdxConfig,
  useUsdxMintQuote,
  useUsdxUsdtBalance,
} from '@/hooks/useUsdxHomeData'
import { useUsdxMintAction } from '@/hooks/useUsdxMintAction'
import {
  getMintFlowCta,
  getMintFlowRows,
  shouldAutoFinishMint,
} from '@/utils/usdx/mintFlowViews'
import {
  USDX_MINT_K,
  USDX_MINT_R_RATE,
  getMintGateCopy,
  getMintLocalPreview,
} from '@/utils/usdx/mintQuote'
import {
  formatBalanceDisplayText,
  getBalanceReadState,
  getDepositErrorMessage,
  parseDepositD,
} from '@/utils/usdx/amounts'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { UsdxExplainSheet } from './UsdxExplainSheet'
import { UsdxFaucetBanner } from './UsdxFaucetBanner'
import { UsdxIcon } from './UsdxIcon'
import { UsdxTokenIcon } from './UsdxTokenIcon'
import { UsdxTxConfirmSheet, type TTxConfirmRow } from './UsdxTxConfirmSheet'

type TExplainKey = 'mint' | 'pending' | 'daily'

type TProps = {
  pauseMint: boolean
  protocolLoading: boolean
  protocolError: boolean
  pauseConfigError?: boolean
  protocolLoaded: boolean
  priceOk: boolean
  active?: boolean
  onConnect: () => void
  onNavigateAfterSuccess: () => void
  onMintSuccess?: () => void | Promise<void>
}

export const UsdxMint = ({
  pauseMint,
  protocolLoading,
  protocolError,
  pauseConfigError = false,
  protocolLoaded,
  priceOk,
  active = true,
  onConnect,
  onNavigateAfterSuccess,
  onMintSuccess,
}: TProps) => {
  const { i18n } = useLingui()
  const { isConnected, chainId } = useAccount()
  const usdx = useUsdxConfig()
  const targetChainId = usdx?.chainId
  const [raw, setRaw] = useState('')
  const [explain, setExplain] = useState<TExplainKey | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const debouncedRaw = useDebouncedValue(raw, USDX_CHAIN_QUOTE_DEBOUNCE_MS)
  const { quote, loading: quoteLoading, error: quoteError, usdtIn: quoteUsdtIn } =
    useUsdxMintQuote(debouncedRaw)
  const usdtBal = useUsdxUsdtBalance()
  const boxBal = useUsdxBoxBalance()
  const { start, retry, reset, phase, stepId, flags, failKind, busy, error: mintError } =
    useUsdxMintAction()
  const finishingRef = useRef(false)
  const q = useMemo(() => getMintQuoteDisplay(quote), [quote])
  const parsedD = parseDepositD(raw)
  const d = parsedD.ok ? parsedD.d : 0n
  const usdtIn = parsedD.ok ? parsedD.usdtIn : 0n
  const mintQuoteDebouncing = d > 0n && debouncedRaw.trim() !== raw.trim()
  const mintQuoteSynced = d > 0n && isMintQuoteAmountSynced(usdtIn, quoteUsdtIn)
  const mintQuoteFetching = !mintQuoteDebouncing && mintQuoteSynced && quoteLoading
  const localPreview = useMemo(() => getMintLocalPreview(d), [d])
  /* 展示优先链上报价；空投入 / 尚未返回时用本地公式，避免「—」占位（对齐 HTML + 截图） */
  const displayLockL0 = q.lockL0 ?? localPreview.L0
  const displayM = q.M ?? localPreview.M
  const displayR = q.R ?? localPreview.R
  const displayBoxIn = mintQuoteSynced ? (q.boxIn ?? 0n) : 0n
  const boxNeed = mintQuoteSynced && q.boxIn != null ? BigInt(q.boxIn) : null
  const usdtBalanceState = getBalanceReadState(
    usdtBal.amount,
    usdtBal.isLoading,
    usdtBal.isError
  )
  const boxBalanceState = getBalanceReadState(boxBal.amount, boxBal.isLoading, boxBal.isError)
  const balanceLoading =
    usdtBalanceState.status === 'loading' || boxBalanceState.status === 'loading'
  const balancesReady =
    usdtBalanceState.status === 'ready' && boxBalanceState.status === 'ready'
  const usdtWalletText = formatBalanceDisplayText(usdtBalanceState, formatUsdxMoney)
  const boxWalletText = formatBalanceDisplayText(boxBalanceState, formatUsdxMoney)

  const gateReason = getMintUnavailableReason({
    hasConfig: Boolean(usdx),
    pauseMint,
    pauseConfigError,
    protocolLoading,
    protocolError,
    protocolLoaded,
    priceOk,
    quoteLoading: Boolean(d > 0n && mintQuoteFetching),
    quoteError: Boolean(d > 0n && mintQuoteSynced && quoteError),
    quoteMintable: mintQuoteSynced && quote ? Boolean(q.mintable) : undefined,
  })
  const gateLoading = gateReason === 'loading'

  let err = ''
  if (raw) {
    if (!parsedD.ok) {
      err = getDepositErrorMessage(parsedD.code)
    } else if (gateLoading) err = ''
    else if (gateReason && getMintGateCopy(gateReason)) err = getMintGateCopy(gateReason)
    else if (!isConnected) err = t`Please connect your wallet`
    else if (targetChainId && chainId !== targetChainId) err = t`Please switch to BNB Smart Chain`
    else if (balanceLoading) err = ''
    else if (usdtBalanceState.status === 'error') {
      err = t`Failed to read USDT balance, please refresh and retry`
    } else if (boxBalanceState.status === 'error') {
      err = t`Failed to read BOX balance, please refresh and retry`
    } else if (usdtIn > usdtBalanceState.amount) {
      err = t`Insufficient USDT balance, max ${formatUsdxAmount(usdtBalanceState.amount)}`
    } else if (boxNeed != null && boxNeed > boxBalanceState.amount) {
      err = t`Insufficient BOX balance, max ${formatUsdxAmount(boxBalanceState.amount, 2)}`
    }
  }

  const canSubmit =
    parsedD.ok &&
    balancesReady &&
    !err &&
    !gateLoading &&
    !gateReason &&
    mintQuoteSynced &&
    !quoteLoading &&
    Boolean(q.mintable) &&
    isConnected &&
    chainId === targetChainId &&
    phase === 'idle'

  const explains: Record<TExplainKey, { title: string; points: { label: string; text: ReactNode }[] }> =
    useMemo(
      () => ({
        /* 设计稿 usdx-stablecoin.html EXPLAIN.mint（2026-09-11 简易说明书） */
        mint: {
          title: t`About minting`,
          points: [
            {
              label: t`Contribution`,
              text: (
                <Trans>
                  USDT and BOX <b>50% each</b>, converted at the 24h average.
                </Trans>
              ),
            },
            {
              label: t`Proceeds`,
              text: (
                <Trans>
                  <b>1.2×</b> credit, all pending unlock (nothing credited at mint); released at
                  0.3% daily over 334 days, must <b>actively claim</b>. Locked amount cannot be
                  transferred or redeemed.
                </Trans>
              ),
            },
            {
              label: t`Where deposits go`,
              text: (
                <Trans>
                  Treasury <b>70%</b> · permanently locked LP <b>20%</b> · remaining 10%.
                </Trans>
              ),
            },
            {
              label: t`Exit path`,
              text: t`Sell via the swap pool or redeem from the treasury.`,
            },
          ],
        },
        pending: {
          title: t`What is pending unlock`,
          points: [
            {
              label: t`Nature`,
              text: (
                <Trans>
                  On-contract <b>accounting equity</b>, not yet minted as USDX; it will not show in
                  the wallet.
                </Trans>
              ),
            },
            {
              label: t`Restrictions`,
              text: t`Cannot transfer, redeem, or cash out early.`,
            },
            {
              label: t`Release rules`,
              text: (
                <Trans>
                  0.3% released daily; <b>actively claim</b> to mint as USDX.
                </Trans>
              ),
            },
          ],
        },
        daily: {
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
            {
              label: t`Period`,
              text: t`333 equal days, remainder on day 334, 100% in total.`,
            },
            {
              label: t`Multiple mints`,
              text: (
                <Trans>
                  Each mint is independent; amounts due but unclaimed <b>are not voided</b>.
                </Trans>
              ),
            },
          ],
        },
      }),
      [i18n.locale]
    )

  const explainItem = explain ? explains[explain] : null

  const confirmPayRows = useMemo((): TTxConfirmRow[] => {
    return [
      { label: 'USDT', value: formatUsdxAmount(usdtIn, 2) },
      {
        label: 'BOX',
        value: formatUsdxAmount(displayBoxIn, 2),
      },
    ]
  }, [displayBoxIn, usdtIn])

  const confirmGetRows = useMemo((): TTxConfirmRow[] => {
    return [
      {
        label: t`Pending unlock`,
        value: `${formatUsdxAmount(displayLockL0, 2)} USDX`,
      },
    ]
  }, [displayLockL0, i18n.locale])

  const flowCta = useMemo(
    () => getMintFlowCta({ phase, stepId }),
    [phase, stepId, i18n.locale]
  )
  const progressSteps = useMemo(
    () => getMintFlowRows(flags, { failKind }),
    [failKind, flags, i18n.locale]
  )
  const progressOpen = phase !== 'idle'

  const finishMint = async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    try {
      const lockText = formatUsdxAmount(displayLockL0, 2)
      const message = t`Mint successful, ${lockText} USDX credit registered as pending unlock`
      await onMintSuccess?.()
      setRaw('')
      setConfirmOpen(false)
      reset()
      onNavigateAfterSuccess()
      showUsdxToastSuccessAfterNav(message)
    } finally {
      finishingRef.current = false
    }
  }

  const onMintClick = () => {
    if (!isConnected) {
      onConnect()
      return
    }
    if (phase === 'checking' || phase === 'run') {
      setConfirmOpen(true)
      return
    }
      if (phase === 'retry') {
        setConfirmOpen(true)
        void retry()
          .then((result) => {
            if (shouldAutoFinishMint(result)) void finishMint()
          })
          .catch((e) => {
            if (!isUserRejectedWalletError(e)) {
              const msg = e instanceof Error ? e.message : t`Mint failed, please try again`
              showUsdxToastError(msg)
            }
          })
        return
      }
    if (phase === 'finish') {
      void finishMint()
      return
    }
    if (!canSubmit) return
    setConfirmOpen(true)
  }

  const onConfirmMint = async () => {
    if (phase === 'checking' || phase === 'run') return
    if (phase === 'finish') {
      await finishMint()
      return
    }
    try {
      const result = phase === 'retry' ? await retry() : await start(raw, q)
      if (shouldAutoFinishMint(result)) await finishMint()
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = e instanceof Error ? e.message : t`Mint failed, please try again`
        showUsdxToastError(msg)
      }
    }
  }

  useEffect(() => {
    if (!mintError) return
    showUsdxToastError(mintError)
  }, [mintError])

  const onRefreshBalances = async () => {
    await Promise.all([usdtBal.refetch(), boxBal.refetch()])
  }

  return (
    <section
      className={`screen screen--tab${active ? ' active' : ''}`}
      id="s-mint"
      aria-label={t`Mint USDX`}
      aria-hidden={!active}
    >
      <div className="screen-body">
        <UsdxFaucetBanner onConnect={onConnect} onSuccess={() => void onRefreshBalances()} />
        <div className="amt-block">
          <div className="amt-head">
            <span className="amt-label">{t`Deposit amount`}</span>
            <button
              className="q-tip"
              type="button"
              aria-label={t`About minting`}
              onClick={() => setExplain('mint')}
            >
              <UsdxIcon name="help-circle" />
            </button>
          </div>
          <div className="amt-big-row">
            <input
              className="amt-big-input"
              inputMode="decimal"
              placeholder="0"
              aria-label={t`Deposit amount (USDT)`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              disabled={phase !== 'idle'}
            />
          </div>
          {gateLoading && d > 0n ? (
            <div className="amt-err" style={{ color: 'var(--text-secondary, #888)' }}>
              <span>{t`Reading protocol status…`}</span>
            </div>
          ) : null}
          {!err && !gateLoading && balanceLoading && parsedD.ok ? (
            <div className="amt-err" style={{ color: 'var(--text-secondary, #888)' }}>
              <span>{t`Reading pay-token balances…`}</span>
            </div>
          ) : null}
          {err ? (
            <div className="amt-err">
              <UsdxIcon name="alert-circle" />
              <span>{err}</span>
            </div>
          ) : null}
          <div className="amt-token-list">
            <div className="token-pill">
              <UsdxTokenIcon sym="USDT" />
              <span className="tp-body">
                <span className="tp-sym">USDT</span>
                <span className="tp-qty num">{formatUsdxAmount(usdtIn, 2)}</span>
                <span className="sub">
                  <UsdxIcon name="wallet" size={12} />
                  <span className="num">{usdtWalletText}</span>
                </span>
              </span>
            </div>
            <div className="token-pill">
              <UsdxTokenIcon sym="BOX" />
              <span className="tp-body">
                <span className="tp-sym">BOX</span>
                <span className="tp-qty num">
                  {mintQuoteFetching ? '…' : formatUsdxAmount(displayBoxIn, 3)}
                </span>
                <span className="sub">
                  <UsdxIcon name="wallet" size={12} />
                  <span className="num">{boxWalletText}</span>
                </span>
              </span>
            </div>
          </div>
          {d > 0n ? (
            <div className="mint-result">
              <div className="flow-arrow">
                <UsdxIcon name="arrow-down" />
              </div>
              <div className="mint-mint-pill">
                <span className="mm-label">{t`Mint`}</span>
                <span className="mm-value num">{`${formatUsdxAmount(displayM, 2)} USDX`}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="card-title" style={{ padding: 'var(--sp-16) var(--sp-18) 0' }}>
            {t`You will receive`}
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">
                {t`Pending unlock`}
                <span className="lbl-pct">{formatUsdxPct(USDX_MINT_K, 0)}</span>
                <button
                  className="q-tip"
                  type="button"
                  aria-label={t`What is pending unlock`}
                  onClick={() => setExplain('pending')}
                >
                  <UsdxIcon name="help-circle" />
                </button>
              </span>
              <span className="info-value">{`${formatUsdxAmount(displayLockL0, 2)} USDX`}</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                {t`Daily release`}
                <button
                  className="q-tip"
                  type="button"
                  aria-label={t`How daily release is calculated`}
                  onClick={() => setExplain('daily')}
                >
                  <UsdxIcon name="help-circle" />
                </button>
              </span>
              <span className="info-value">
                {displayR > 0n
                  ? `${formatUsdxPct(USDX_MINT_R_RATE, 1)} · ${formatUsdxReleaseAmount(displayR)} USDX`
                  : '—'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">{t`Mint premium`}</span>
              <span className="info-value pos">20%</span>
            </div>
          </div>
          <div
            className="warn-ribbon neutral-tone"
            style={{ margin: '0 var(--sp-18) var(--sp-16)' }}
          >
            <UsdxIcon name="info" />
            <span>{t`No credit at mint: the amount is recorded as pending unlock and released daily`}</span>
          </div>
        </div>

        <div className="cta-bar cta-bar--inline">
          <button
            className={`btn btn-primary btn-xl btn-block${busy ? ' is-loading' : ''}`}
            type="button"
            disabled={phase === 'idle' ? !canSubmit && isConnected : busy}
            onClick={() => onMintClick()}
          >
            {phase !== 'idle' ? (
              <>
                {flowCta.loading ? <span className="btn-spinner" aria-hidden /> : null}
                {flowCta.text}
              </>
            ) : !isConnected ? (
              t`Connect Wallet`
            ) : (
              t`Mint`
            )}
          </button>
        </div>
      </div>

      <UsdxTxConfirmSheet
        open={confirmOpen}
        title={t`Confirm mint`}
        confirmLabel={flowCta.text}
        confirmLoading={flowCta.loading}
        confirmDisabled={flowCta.disabled}
        paySectionLabel={t`You deposit`}
        getSectionLabel={t`You receive`}
        payRows={confirmPayRows}
        getRows={confirmGetRows}
        progressOpen={progressOpen}
        progressSteps={progressSteps}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void onConfirmMint()}
      />

      <UsdxExplainSheet
        open={Boolean(explainItem)}
        title={explainItem?.title || ''}
        points={explainItem?.points || []}
        onClose={() => setExplain(null)}
      />
    </section>
  )
}
