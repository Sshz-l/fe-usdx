const { toFunctionSelector } = require('viem')
const { usdxT } = require('./usdxI18n')

const MINT_FLOW_STEPS = [
  { id: 'apprU', kind: 'tx', label: 'Approve USDT for Permit2' },
  { id: 'apprB', kind: 'tx', label: 'Approve BOX for Permit2' },
  { id: 'p2', kind: 'sig', label: 'Permit2 signature for USDT and BOX' },
  { id: 'mint', kind: 'tx', label: 'Mint USDX' },
]

const CTA_RUNNING = {
  apprU: 'Approving USDT…',
  apprB: 'Approving BOX…',
  p2: 'Signing Permit2…',
  mint: 'Minting…',
}

const MINT_FLOW_SKIP_MS = 320
const MINT_FLOW_NEXT_MS = 420
const MINT_FLOW_PREP_TIMEOUT_MS = 15000
const MINT_FLOW_WRITE_TIMEOUT_MS = 180000
const MINT_FLOW_TIMEOUT_NAME = 'MintFlowTimeoutError'
const MINT_FLOW_TIMEOUT_MESSAGE = 'Request timed out, please retry'
const MINT_BOX_SLIPPAGE_BPS = 100n
/** quoteMinLpLiquidity 返回的是预期 LP 份额（不含容差），容差由前端扣减 */
const MINT_LP_TOLERANCE_BPS = 100n
const MINT_P2_INDEX = MINT_FLOW_STEPS.findIndex((step) => step.id === 'p2')
const MINT_TX_INDEX = MINT_FLOW_STEPS.findIndex((step) => step.id === 'mint')

const slippageHaystack = (error) => {
  if (error == null) return ''
  if (typeof error === 'string') return error.toLowerCase()
  if (typeof error !== 'object') return String(error).toLowerCase()
  const parts = [error.shortMessage, error.message, error.details, error.reason]
  if (typeof error.data === 'string') parts.push(error.data)
  if (error.cause) parts.push(slippageHaystack(error.cause))
  return parts.filter(Boolean).join('\n').toLowerCase()
}

const MIN_LP_LIQUIDITY_NOT_MET_SELECTOR = toFunctionSelector('MinLpLiquidityNotMet(uint128,uint128)')

const isMintSlippageError = (error) => {
  const text = slippageHaystack(error)
  return (
    text.includes('price slippage check') ||
    text.includes('proto: maxboxin') ||
    text.includes('minlpliquiditynotmet') ||
    text.includes(MIN_LP_LIQUIDITY_NOT_MET_SELECTOR)
  )
}

const resolveMinLpLiquidity = (value) => {
  if (value == null) return null
  const n = (BigInt(value) * (10000n - MINT_LP_TOLERANCE_BPS)) / 10000n
  return n > 0n ? n : null
}

/**
 * 仅滑点回到 p2 重签；超时等其它错误必须停在 mint 步复用原 Permit2 签名，
 * 这样首笔若已上链，重试会因 nonce 已用而 revert，不会重复铸造。
 */
const getMintRetryFromIndex = (failedIndex, error) => {
  if (failedIndex === MINT_TX_INDEX && isMintSlippageError(error)) return MINT_P2_INDEX
  return failedIndex
}

const applyMintQuoteRefresh = (quote) => {
  const boxIn = quote?.boxIn ?? quote?.[0]
  const mintable = quote?.mintable ?? quote?.[5]
  const n = BigInt(boxIn ?? 0)
  if (mintable === false || n <= 0n) return { ok: false }
  return { ok: true, boxIn: n, maxBoxIn: n + (n * MINT_BOX_SLIPPAGE_BPS) / 10000n }
}

const canSkipMintFlowStep = (step, approved = {}) =>
  step?.kind === 'tx' && step.id !== 'mint' && approved[step.id] === true

const createMintFlowTimeoutError = () => {
  const error = new Error(MINT_FLOW_TIMEOUT_MESSAGE)
  error.name = MINT_FLOW_TIMEOUT_NAME
  return error
}

const isMintFlowTimeoutError = (error) =>
  Boolean(error && typeof error === 'object' && error.name === MINT_FLOW_TIMEOUT_NAME)

const withMintFlowTimeout = (promise, ms) => {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createMintFlowTimeoutError()), ms)
  })
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer))
}

const getMintFlowStepStatus = (step, flag, opts = {}) => {
  if (flag === 'prep') return usdxT('Preparing transaction…')
  if (flag === 'wait') {
    return step?.kind === 'sig'
      ? usdxT('Waiting for wallet signature…')
      : usdxT('Waiting for wallet confirmation…')
  }
  if (flag === 'skip') return usdxT('No action needed')
  if (flag === 'fail') {
    if (opts.failKind === 'slippage') return usdxT('BOX price changed')
    if (opts.failKind === 'chain') return usdxT('Failed, please retry')
    return usdxT('Cancelled in wallet')
  }
  if (flag === 'done') {
    return step?.kind === 'sig' ? usdxT('Signed') : usdxT('Confirmed')
  }
  if (opts.previousReady && opts.failKind === 'slippage') {
    return step?.kind === 'sig' ? usdxT('Sign again') : usdxT('Waiting to retry')
  }
  return usdxT('Waiting for previous step')
}

const getMintFlowCta = ({ phase, stepId } = {}) => {
  if (phase === 'checking') {
    return { text: usdxT('Checking…'), loading: true, disabled: true }
  }
  if (phase === 'run') {
    return {
      text: usdxT(CTA_RUNNING[stepId] || CTA_RUNNING.mint),
      loading: true,
      disabled: true,
    }
  }
  if (phase === 'retry') return { text: usdxT('Retry'), loading: false, disabled: false }
  if (phase === 'finish') return { text: usdxT('Finish'), loading: false, disabled: false }
  return { text: usdxT('Confirm mint'), loading: false, disabled: false }
}

const shouldAutoFinishMint = (phase) => phase === 'finish'

const createMintFlowFlags = () => MINT_FLOW_STEPS.map(() => 'todo')

const patchMintFlowFlag = (flags, index, flag) =>
  (Array.isArray(flags) ? flags : createMintFlowFlags()).map((item, i) =>
    i === index ? flag : item
  )

const getMintFlowRows = (flags, opts = {}) =>
  MINT_FLOW_STEPS.map((step, i) => {
    const flag = flags?.[i] || 'todo'
    const previousReady = (flags || []).slice(0, i).every((item) => item === 'skip' || item === 'done')
    return {
      id: step.id,
      kind: step.kind,
      label: usdxT(step.label),
      flag,
      status: getMintFlowStepStatus(step, flag, { failKind: opts.failKind, previousReady }),
    }
  })

module.exports = {
  MIN_LP_LIQUIDITY_NOT_MET_SELECTOR,
  MINT_BOX_SLIPPAGE_BPS,
  MINT_FLOW_NEXT_MS,
  MINT_FLOW_PREP_TIMEOUT_MS,
  MINT_FLOW_SKIP_MS,
  MINT_FLOW_STEPS,
  MINT_FLOW_TIMEOUT_MESSAGE,
  MINT_FLOW_WRITE_TIMEOUT_MS,
  MINT_LP_TOLERANCE_BPS,
  MINT_P2_INDEX,
  applyMintQuoteRefresh,
  canSkipMintFlowStep,
  createMintFlowFlags,
  getMintFlowCta,
  getMintFlowRows,
  getMintFlowStepStatus,
  getMintRetryFromIndex,
  isMintFlowTimeoutError,
  isMintSlippageError,
  patchMintFlowFlag,
  resolveMinLpLiquidity,
  shouldAutoFinishMint,
  withMintFlowTimeout,
}
