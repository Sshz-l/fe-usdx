import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useAccount } from 'wagmi'

import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'
import { useDebouncedValue, USDX_CHAIN_QUOTE_DEBOUNCE_MS } from '@/hooks/useDebouncedValue'
import { useUsdxSwapBuyAction } from '@/hooks/useUsdxSwapBuyAction'
import { useUsdxSwapSellAction } from '@/hooks/useUsdxSwapSellAction'
import { useUsdxCancelSellAction, useUsdxSellOrders } from '@/hooks/useUsdxCancelSellAction'
import { formatUsdxAmount } from '@/utils/usdx/homeViews'
import {
  quoteSwapPreview,
  formatSwapBuySuccessMessage,
  formatSwapMinRecvLabel,
  formatSwapRecvAmount,
  getBuyMinOrderMessage,
  getSellMinOrderMessage,
  getSellSettlementLabel,
  getSwapPayLimitMessage,
  getSwapSellFeeLabel,
  isBelowStabilizerMinBuy,
  isBelowStabilizerMinSell,
  isSellQuoteAmountSynced,
  previewSellRecvWei,
  resolveSellInstantHint,
  resolveSellMinRecvWei,
  resolveSellRecvWei,
  sumBuyLiquidity,
  SWAP_PRICE_LABEL,
} from '@/utils/usdx/swapQuote'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'
import {
  formatGlobalSellQueueText,
  formatSellSuccessMessage,
  getSellCtaLabel,
  getStabilizerWriteGate,
  isSellInstantFill,
  shouldRefreshActiveSellOrders,
} from '@/utils/usdx/orderViews'
import {
  formatTokenAmountFixed,
  getBalanceReadState,
  getBooleanReadState,
} from '@/utils/usdx/amounts'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import {
  useUsdxConfig,
  useUsdxSellQuote,
  useUsdxStabilizer,
  useUsdxUsdtBalance,
} from '@/hooks/useUsdxHomeData'
import { UsdxFaucetBanner } from './UsdxFaucetBanner'
import { UsdxExplainSheet } from './UsdxExplainSheet'
import { UsdxIcon } from './UsdxIcon'
import { UsdxQueueSheet } from './UsdxQueueSheet'
import { USDX_TOKEN_ICONS } from './UsdxTokenIcon'

type TDir = 'U2X' | 'X2U'

const TokenMark = ({
  sym,
  assetPrefix,
}: {
  sym: 'USDT' | 'USDX'
  assetPrefix: string
}) => (
  <span className="sc-tic">
    <img
      src={sym === 'USDT' ? USDX_TOKEN_ICONS.USDT : `${assetPrefix}/usdx/assets/usdx.png`}
      alt={sym}
    />
  </span>
)

type TProps = {
  assetPrefix: string
  active?: boolean
  onConnect: () => void
  onRefresh: () => void | Promise<void>
  usdxWallet: bigint
  userLoading?: boolean
  userError?: boolean
}

export const UsdxSwap = ({
  assetPrefix,
  active = true,
  onConnect,
  onRefresh,
  usdxWallet,
  userLoading = false,
  userError = false,
}: TProps) => {
  const { i18n } = useLingui()
  const { isConnected, chainId } = useAccount()
  const usdx = useUsdxConfig()
  const targetChainId = usdx?.chainId
  const usdtBalQuery = useUsdxUsdtBalance()
  const stab = useUsdxStabilizer()
  const refetchStabilizer = stab.refetch
  const refetchUsdtBalance = usdtBalQuery.refetch
  const { buyUsdtToUsdx, submitting: buySubmitting, txHash: buyHash, isSuccess: buySuccess, resetWrite: resetBuy } =
    useUsdxSwapBuyAction()
  const { sellUsdx, submitting: sellSubmitting, txHash: sellHash, isSuccess: sellSuccess, orderId: sellOrderId, resetWrite: resetSell } =
    useUsdxSwapSellAction()
  const sellOrders = useUsdxSellOrders()
  const {
    items: sellOrderItems,
    hasMore: sellOrdersHasMore,
    loading: sellOrdersLoading,
    error: sellOrdersError,
    refetch: refetchSellOrders,
    loadMore: loadMoreSellOrders,
  } = sellOrders
  const {
    cancelSell,
    resolveCancelOutcome,
    submittingId: cancelSubmittingId,
    isSuccess: cancelSuccess,
    txHash: cancelHash,
    resetWrite: resetCancel,
  } = useUsdxCancelSellAction()
  const lastSuccessHash = useRef<string | null>(null)
  const globalQueueText = formatGlobalSellQueueText({
    amountWei: stab.globalQueueAmount,
    count: stab.globalQueueCount,
    amountLoading: stab.inventoryLoading,
    countLoading: stab.globalQueueCountLoading,
  })
  const [dir, setDir] = useState<TDir>('U2X')
  const [raw, setRaw] = useState('')
  const [pct, setPct] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [feeExplainOpen, setFeeExplainOpen] = useState(false)
  const submitting = buySubmitting || sellSubmitting
  const isBuy = dir === 'U2X'
  const sellQuoteInput = isBuy ? '' : raw
  const debouncedSellQuoteInput = useDebouncedValue(sellQuoteInput, USDX_CHAIN_QUOTE_DEBOUNCE_MS)
  const sellQuote = useUsdxSellQuote(debouncedSellQuoteInput)

  const usdtBalanceState = getBalanceReadState(
    usdtBalQuery.amount,
    usdtBalQuery.isLoading,
    usdtBalQuery.isError
  )
  const usdxBalanceState = getBalanceReadState(usdxWallet, userLoading, userError)
  const payBalanceState = dir === 'U2X' ? usdtBalanceState : usdxBalanceState
  const payBalanceWei = payBalanceState.status === 'ready' ? payBalanceState.amount : null
  const payBalanceLoading = isConnected && payBalanceState.status === 'loading'
  const payBalanceError = isConnected && payBalanceState.status === 'error'
  const payBalanceText = !isConnected
    ? '—'
    : payBalanceLoading
      ? t`Loading…`
      : payBalanceError
        ? t`Failed to load`
        : formatUsdxAmount(payBalanceWei, 2)
  const q = useMemo(
    () => quoteSwapPreview(dir, raw, payBalanceWei),
    [dir, i18n.locale, payBalanceWei, raw]
  )
  const pauseState = getBooleanReadState(stab.paused, stab.pauseLoading, stab.pauseError)
  const writeGate = getStabilizerWriteGate({
    paused: pauseState.status === 'ready' ? pauseState.value : null,
  })
  const inventoryState = getBalanceReadState(
    stab.inventory,
    stab.inventoryLoading,
    stab.inventoryError
  )
  const poolState = getBalanceReadState(stab.poolUsdx, stab.poolLoading, stab.poolError)
  const inventory = inventoryState.status === 'ready' ? inventoryState.amount : null
  const poolUsdx = poolState.status === 'ready' ? poolState.amount : null
  const buyLiquidity =
    inventoryState.status === 'ready' && poolState.status === 'ready'
      ? sumBuyLiquidity(inventory, poolUsdx)
      : null

  const payWei = q.amt
  const hasPayAmount = q.valid && payWei > 0n
  const sellQuoteDebouncing =
    !isBuy && hasPayAmount && debouncedSellQuoteInput.trim() !== sellQuoteInput.trim()
  const sellQuoteSynced =
    !isBuy && hasPayAmount && isSellQuoteAmountSynced(payWei, sellQuote.amount)
  const sellQuoteFetching =
    !isBuy && hasPayAmount && !sellQuoteDebouncing && sellQuoteSynced && sellQuote.loading
  const sellInstantHint = resolveSellInstantHint({
    quoteSynced: sellQuoteSynced,
    quoteInstant: sellQuote.instant,
    payWei,
    reserveWei: typeof stab.reserve === 'bigint' ? stab.reserve : undefined,
    queueCount: stab.globalQueueCount,
  })
  /** 买入 1:1：收到 = 支付；卖出即时按 0.5%、挂单按 0.1% 本地预览，报价就绪后用链上 netUsdt */
  const belowMinSell = !isBuy && hasPayAmount && isBelowStabilizerMinSell(payWei)
  const belowMinBuy = isBuy && hasPayAmount && isBelowStabilizerMinBuy(payWei)
  const localSellGot = previewSellRecvWei(payWei, sellInstantHint)
  const recvWei = isBuy
    ? q.got
    : sellQuoteSynced
      ? resolveSellRecvWei(sellQuote.netUsdt, localSellGot)
      : localSellGot
  const minRecvWei = isBuy
    ? q.got
    : resolveSellMinRecvWei({
        instant: sellInstantHint,
        netUsdt: sellQuoteSynced ? sellQuote.netUsdt : null,
        amountWei: payWei,
      })
  const recvDisplay = formatSwapRecvAmount(recvWei)
  const minRecvLabel = formatSwapMinRecvLabel(minRecvWei, q.recv)
  const feeLabel = isBuy ? q.feeLabel : getSwapSellFeeLabel(sellInstantHint)
  let err = ''
  if (!q.valid && raw) {
    err = t`Please enter a valid amount`
  }

  if (!err && hasPayAmount) {
    if (!isConnected) err = t`Please connect your wallet`
    else if (targetChainId && chainId !== targetChainId) err = t`Please switch to BNB Smart Chain`
    else if (payBalanceLoading) err = ''
    else if (payBalanceError) err = t`Failed to read ${q.pay} balance, please refresh and retry`
    else {
      const payLimit = getSwapPayLimitMessage(q, {
        payBalanceWei,
        inventoryWei: inventoryState.status === 'ready' ? inventoryState.amount : null,
        poolWei: poolState.status === 'ready' ? poolState.amount : null,
        isBuy,
      })
      if (payLimit) err = payLimit
    }
    if (!err && pauseState.status === 'loading') err = ''
    else if (!err && pauseState.status === 'error') err = t`Failed to read stabilizer status, please refresh and retry`
    else if (!err && !writeGate.buy && isBuy) err = t`Stabilizer paused, swap unavailable`
    else if (!err && !writeGate.sell && !isBuy) err = t`Stabilizer paused, swap unavailable`
    else if (!err && isBuy) {
      if (inventoryState.status === 'loading' || poolState.status === 'loading') err = ''
      else if (inventoryState.status === 'error' || poolState.status === 'error') {
        err = t`Failed to read inventory, please refresh and retry`
      } else if (buyLiquidity === 0n) {
        err = t`Insufficient USDX liquidity, buying unavailable`
      } else if (belowMinBuy) {
        err = getBuyMinOrderMessage()
      }
    } else if (!err && !isBuy && belowMinSell) {
      err = getSellMinOrderMessage()
    } else if (!err && !isBuy && hasPayAmount && sellQuoteFetching) {
      err = ''
    } else if (!err && !isBuy && hasPayAmount && sellQuoteSynced && sellQuote.error) {
      err = t`Failed to read sell quote, please refresh and retry`
    }
  }

  const canBuySubmit =
    isBuy &&
    hasPayAmount &&
    !belowMinBuy &&
    payBalanceState.status === 'ready' &&
    q.canSubmit &&
    pauseState.status === 'ready' &&
    writeGate.buy &&
    inventoryState.status === 'ready' &&
    poolState.status === 'ready' &&
    buyLiquidity != null &&
    buyLiquidity > 0n &&
    !err &&
    !payBalanceLoading &&
    isConnected &&
    chainId === targetChainId &&
    !submitting

  const canSellSubmit =
    !isBuy &&
    hasPayAmount &&
    !belowMinSell &&
    payBalanceState.status === 'ready' &&
    q.canSubmit &&
    pauseState.status === 'ready' &&
    writeGate.sell &&
    sellQuoteSynced &&
    !sellQuote.loading &&
    !sellQuote.error &&
    recvWei > 0n &&
    !err &&
    !payBalanceLoading &&
    isConnected &&
    chainId === targetChainId &&
    !submitting

  const lastSellOrderId = useRef<bigint | null>(null)
  const lastBuyAmount = useRef(0n)
  const lastSellMeta = useRef<{ amount: bigint; netUsdt: bigint | null; quoteInstant: boolean }>({
    amount: 0n,
    netUsdt: null,
    quoteInstant: false,
  })
  useEffect(() => {
    if (sellOrderId != null) lastSellOrderId.current = sellOrderId
  }, [sellOrderId])

  /** 买入 / 卖出成功各自独立处理，避免用户切到另一方向后跳过刷新挂单 */
  useEffect(() => {
    if (!buySuccess || !buyHash) return
    const id = String(buyHash)
    if (lastSuccessHash.current === id) return
    lastSuccessHash.current = id
    const amount = lastBuyAmount.current > 0n ? lastBuyAmount.current : q.amt
    void (async () => {
      // 先清空输入，避免刷新余额/库存时插出「正在读取…」把卡片顶一下
      setRaw('')
      setPct(0)
      showUsdxToastSuccess(formatSwapBuySuccessMessage(amount))
      await onRefresh()
      await refetchUsdtBalance()
      await refetchStabilizer()
      resetBuy()
    })()
  }, [
    buyHash,
    buySuccess,
    onRefresh,
    q.amt,
    refetchStabilizer,
    refetchUsdtBalance,
    resetBuy,
  ])

  useEffect(() => {
    if (!sellSuccess || !sellHash) return
    const id = String(sellHash)
    if (lastSuccessHash.current === id) return
    lastSuccessHash.current = id
    const capturedSellOrderId = lastSellOrderId.current
    const { amount, netUsdt, quoteInstant } = lastSellMeta.current
    void (async () => {
      setRaw('')
      setPct(0)
      showUsdxToastSuccess(
        formatSellSuccessMessage({
          instant: isSellInstantFill(capturedSellOrderId, quoteInstant),
          netUsdt,
          amount: amount > 0n ? amount : q.amt,
        })
      )
      await onRefresh()
      await refetchUsdtBalance()
      await refetchStabilizer()
      if (shouldRefreshActiveSellOrders(capturedSellOrderId)) {
        await refetchSellOrders()
      }
      resetSell()
    })()
  }, [
    onRefresh,
    q.amt,
    refetchSellOrders,
    refetchStabilizer,
    refetchUsdtBalance,
    resetSell,
    sellHash,
    sellSuccess,
  ])

  useEffect(() => {
    if (!cancelSuccess || !cancelHash) return
    const id = String(cancelHash)
    if (lastSuccessHash.current === id) return
    lastSuccessHash.current = id
    void (async () => {
      const message = await resolveCancelOutcome()
      await onRefresh()
      await refetchSellOrders()
      await refetchStabilizer()
      showUsdxToastSuccess(message)
      resetCancel()
    })()
  }, [
    cancelSuccess,
    cancelHash,
    onRefresh,
    resetCancel,
    refetchStabilizer,
    refetchSellOrders,
    resolveCancelOutcome,
  ])

  const onSubmit = async () => {
    if (!isConnected) {
      onConnect()
      return
    }
    if (isBuy) {
      if (!canBuySubmit) return
      try {
        lastBuyAmount.current = payWei
        await buyUsdtToUsdx(raw)
      } catch (e) {
        if (!isUserRejectedWalletError(e)) {
          showUsdxToastError(getUsdxWriteErrorMessage(e, t`Swap failed, please try again`))
        }
      }
      return
    }
    if (!canSellSubmit) return
    try {
      lastSellMeta.current = {
        amount: payWei,
        netUsdt: sellQuote.netUsdt,
        quoteInstant: sellInstantHint,
      }
      await sellUsdx(raw, { instant: sellInstantHint })
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        showUsdxToastError(getUsdxWriteErrorMessage(e, t`Swap failed, please try again`))
      }
    }
  }

  const onCancelOrder = async (orderId: bigint) => {
    try {
      await cancelSell(orderId)
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = getUsdxWriteErrorMessage(e, t`Cancel failed, please try again`)
        showUsdxToastError(msg)
      }
    }
  }

  const ctaDisabled = isConnected && (isBuy ? !canBuySubmit : !canSellSubmit)
  /* C29：买入「兑换」；卖出按 instant 区分「兑换」/「提交挂单」 */
  const ctaLabel = useMemo(() => {
    if (!isConnected) return t`Connect Wallet`
    if (isBuy) {
      if (submitting) return t`Processing…`
      return t`Swap`
    }
    return getSellCtaLabel({
      instant: sellInstantHint,
      submitting,
      loading: hasPayAmount && sellQuoteFetching,
    })
  }, [hasPayAmount, i18n.locale, isBuy, isConnected, sellInstantHint, sellQuoteFetching, submitting])

  const openQueueSheet = () => {
    setQueueOpen(true)
    void refetchSellOrders()
  }

  const onSlider = (next: number) => {
    setPct(next)
    const balance = payBalanceState.status === 'ready' ? payBalanceState.amount : 0n
    const amount = (balance * BigInt(next)) / 100n
    setRaw(next > 0 ? formatTokenAmountFixed(amount, 2) : '')
  }

  const flipDir = () => {
    setDir((cur) => (cur === 'U2X' ? 'X2U' : 'U2X'))
    setRaw('')
    setPct(0)
    setQueueOpen(false)
  }

  const feeExplain = useMemo(
    (): { title: string; points: { label: string; text: ReactNode }[] } => ({
      title: t`Fee details`,
      points: [
        {
          label: t`Buying`,
          text: (
            <Trans>
              USDT → USDX <b>free</b>, instant.
            </Trans>
          ),
        },
        {
          label: t`Sell · open order`,
          text: (
            <Trans>
              <b>0.5% → 0.1%</b>, decreases linearly over 24 hours while queued.
            </Trans>
          ),
        },
        {
          label: t`Sell · instant fill`,
          text: (
            <Trans>
              Fixed <b>0.5%</b>, instant (requires sufficient reserve).
            </Trans>
          ),
        },
        {
          label: t`Cancel & re-queue`,
          text: t`Re-queued orders restart from 0.5%.`,
        },
      ],
    }),
    [i18n.locale]
  )
  /** 设计稿 swapLiqU/swapLiqX：买卖两方向均展示 USDT + USDX 两列（usdx-stablecoin.html renderSwap） */
  const liqU = stab.reserve
  const liqX = buyLiquidity
  const liqULabel = 'USDT'
  const liqXLabel = 'USDX'
  const payFoot = err
    ? { tone: 'err' as const, icon: 'alert-circle' as const, text: err }
    : payBalanceLoading && hasPayAmount
      ? { tone: 'muted' as const, icon: null, text: t`Reading ${q.pay} balance…` }
      : pauseState.status === 'loading' && hasPayAmount
        ? { tone: 'muted' as const, icon: null, text: t`Reading stabilizer status…` }
        : pauseState.status === 'ready' &&
            isBuy &&
            inventoryState.status === 'loading' &&
            hasPayAmount
          ? { tone: 'muted' as const, icon: null, text: t`Reading stabilizer inventory…` }
          : pauseState.status === 'ready' && isBuy && poolState.status === 'loading' && hasPayAmount
            ? { tone: 'muted' as const, icon: null, text: t`Reading stabilizer inventory…` }
            : pauseState.status === 'ready' && !isBuy && sellQuoteFetching && hasPayAmount
              ? { tone: 'muted' as const, icon: null, text: t`Reading sell quote…` }
              : { tone: 'bal' as const, icon: 'wallet' as const, text: payBalanceText }

  return (
    <section
      className={`screen screen--tab${active ? ' active' : ''}`}
      id="s-swap"
      aria-label={t`Swap`}
      aria-hidden={!active}
    >
      <div className="screen-body">
        {isBuy ? (
          <UsdxFaucetBanner
            onConnect={onConnect}
            onSuccess={() => void refetchUsdtBalance()}
          />
        ) : null}
        <div className="swap-cards">
          <div className={`swap-card pay${err ? ' err' : ''}`}>
            <div className="sc-head">
              <span className="sc-title">{t`Pay`}</span>
              <div className="sc-slider">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={pct}
                  aria-label={t`Pay ratio`}
                  onChange={(e) => onSlider(Number(e.target.value))}
                  disabled={payBalanceState.status !== 'ready'}
                />
                <span className={`sc-slider-label${pct === 0 ? ' empty' : ''}`}>
                  {pct > 0 ? `${pct}%` : ''}
                </span>
              </div>
            </div>
            <div className="sc-body">
              <div className="sc-token">
                <TokenMark
                  sym={q.pay === 'USDT' ? 'USDT' : 'USDX'}
                  assetPrefix={assetPrefix}
                />
                <span>{q.pay}</span>
              </div>
              <input
                className="sc-amount"
                inputMode="decimal"
                placeholder="0"
                aria-label={t`Pay amount`}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="sc-bal-row">
              <span
                className={`sc-balance${payFoot.tone === 'err' ? ' sc-balance--err' : payFoot.tone === 'muted' ? ' sc-balance--muted' : ''}`}
                role={payFoot.tone === 'err' ? 'alert' : undefined}
              >
                {payFoot.icon ? <UsdxIcon name={payFoot.icon} size={13} /> : null}
                <span className={payFoot.tone === 'bal' ? 'num' : undefined}>{payFoot.text}</span>
              </span>
            </div>
            <button className="swap-center" type="button" aria-label={t`Switch swap direction`} onClick={flipDir}>
              <UsdxIcon name="arrow-up-down" />
            </button>
          </div>

          <div className="swap-card recv">
            <div className="sc-head">
              <span className="sc-title">{t`Receive`}</span>
            </div>
            <div className="sc-body">
              <div className="sc-token">
                <TokenMark
                  sym={q.recv === 'USDT' ? 'USDT' : 'USDX'}
                  assetPrefix={assetPrefix}
                />
                <span>{q.recv}</span>
              </div>
              <span className="sc-amount num">{recvDisplay}</span>
            </div>
          </div>
        </div>

        <div className={`pro-fold${moreOpen ? ' open' : ''}`} id="swapDetailFold">
          <button
            className="pf-head"
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <span>{t`More info`}</span>
            <UsdxIcon name="chevron-down" className="pf-arrow" />
          </button>
          <div className="pf-body" hidden={!moreOpen}>
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">{t`Minimum received`}</span>
                <span className="info-value num">{minRecvLabel}</span>
              </div>
              <div className="info-row" hidden={!q.isSell}>
                <span className="info-label">{t`Settlement`}</span>
                <span className="info-value">
                  {getSellSettlementLabel({
                    loading: hasPayAmount && sellQuoteFetching,
                    instant: sellInstantHint,
                    belowMin: belowMinSell,
                  })}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">
                  {t`Fee`}
                  <button
                    className="q-tip"
                    type="button"
                    aria-label={t`Fee details`}
                    onClick={() => setFeeExplainOpen(true)}
                  >
                    <UsdxIcon name="help-circle" />
                  </button>
                </span>
                <span className="info-value num">
                  <span>{feeLabel}</span>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">{t`Price`}</span>
                <span className="info-value num">{SWAP_PRICE_LABEL}</span>
              </div>
            </div>
            <div className="liq-section-title">{t`Swap liquidity`}</div>
            <div className="liq-hero">
              <div className="liq-hero-col">
                <div className="liq-hero-label">{liqULabel}</div>
                <div className="liq-hero-amt">
                  <span className="num">
                    {formatUsdxAmount(liqU, 2)}
                  </span>
                </div>
              </div>
              <div className="liq-hero-col">
                <div className="liq-hero-label">{liqXLabel}</div>
                <div className="liq-hero-amt">
                  <span className="num">
                    {formatUsdxAmount(liqX, 2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="liq-queue" hidden={!q.isSell}>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">{t`Market orders`}</span>
                  <span className="info-value num">{globalQueueText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="cta-bar cta-bar--inline">
          <button
            className="btn btn-primary btn-xl btn-block"
            type="button"
            disabled={ctaDisabled}
            onClick={() => void onSubmit()}
          >
            {ctaLabel}
          </button>
        </div>

        <button
          className="queue-entry"
          type="button"
          onClick={openQueueSheet}
        >
          <span>{t`My open orders`}</span>
          <UsdxIcon name="chevron-right" size={14} />
        </button>
      </div>
      <UsdxQueueSheet
        open={queueOpen}
        orders={sellOrderItems}
        loading={sellOrdersLoading}
        error={sellOrdersError}
        hasMore={sellOrdersHasMore}
        cancellingId={cancelSubmittingId}
        onClose={() => setQueueOpen(false)}
        onCancel={(orderId) => void onCancelOrder(orderId)}
        onRetry={() => void refetchSellOrders()}
        onLoadMore={() => void loadMoreSellOrders()}
      />
      <UsdxExplainSheet
        open={feeExplainOpen}
        title={feeExplain.title}
        points={feeExplain.points}
        onClose={() => setFeeExplainOpen(false)}
      />
    </section>
  )
}
