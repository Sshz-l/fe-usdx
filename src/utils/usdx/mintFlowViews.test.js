const test = require('node:test')
const assert = require('node:assert/strict')
const { encodeErrorResult, parseAbiItem } = require('viem')

const {
  MIN_LP_LIQUIDITY_NOT_MET_SELECTOR,
  MINT_FLOW_PREP_TIMEOUT_MS,
  MINT_FLOW_STEPS,
  MINT_FLOW_WRITE_TIMEOUT_MS,
  MINT_LP_TOLERANCE_BPS,
  applyMintQuoteRefresh,
  canSkipMintFlowStep,
  createMintFlowFlags,
  getMintFlowCta,
  getMintFlowRows,
  getMintRetryFromIndex,
  isMintFlowTimeoutError,
  isMintSlippageError,
  resolveMinLpLiquidity,
  shouldAutoFinishMint,
  withMintFlowTimeout,
} = require('./mintFlowViews')

test('mint flow has four steps: approve USDT, approve BOX, Permit2 sign, mint', () => {
  assert.deepEqual(
    MINT_FLOW_STEPS.map((step) => [step.id, step.kind]),
    [
      ['apprU', 'tx'],
      ['apprB', 'tx'],
      ['p2', 'sig'],
      ['mint', 'tx'],
    ]
  )
})

test('only prior approve txs skip; Permit2 signature and mint always run', () => {
  const approved = { apprU: true, apprB: true }
  assert.equal(canSkipMintFlowStep(MINT_FLOW_STEPS[0], approved), true)
  assert.equal(canSkipMintFlowStep(MINT_FLOW_STEPS[1], approved), true)
  assert.equal(canSkipMintFlowStep(MINT_FLOW_STEPS[2], approved), false)
  assert.equal(canSkipMintFlowStep(MINT_FLOW_STEPS[3], approved), false)
  assert.equal(canSkipMintFlowStep(MINT_FLOW_STEPS[0], { apprU: false, apprB: true }), false)
})

test('row copy matches HTML five visual states including 2. skip vs done', () => {
  const flags = ['skip', 'todo', 'wait', 'fail']
  const rows = getMintFlowRows(flags)
  assert.equal(rows[0].label, 'Approve USDT for Permit2')
  assert.equal(rows[0].status, 'No action needed')
  assert.equal(rows[1].status, 'Waiting for previous step')
  assert.equal(rows[2].label, 'Permit2 signature for USDT and BOX')
  assert.equal(rows[2].status, 'Waiting for wallet signature…')
  assert.equal(rows[3].status, 'Cancelled in wallet')

  const done = getMintFlowRows(['done', 'done', 'done', 'wait'])
  assert.equal(done[0].status, 'Confirmed')
  assert.equal(done[2].status, 'Signed')
  assert.equal(done[3].status, 'Waiting for wallet confirmation…')
  assert.equal(done[3].label, 'Mint USDX')

  const preparing = getMintFlowRows(['done', 'done', 'done', 'prep'])
  assert.equal(preparing[3].flag, 'prep')
  assert.equal(preparing[3].status, 'Preparing transaction…')
})

test('cta follows checking / running / retry / finish and keeps mint idle as Confirm mint', () => {
  assert.deepEqual(getMintFlowCta({ phase: 'idle' }), {
    text: 'Confirm mint',
    loading: false,
    disabled: false,
  })
  assert.deepEqual(getMintFlowCta({ phase: 'checking' }), {
    text: 'Checking…',
    loading: true,
    disabled: true,
  })
  assert.equal(getMintFlowCta({ phase: 'run', stepId: 'apprU' }).text, 'Approving USDT…')
  assert.equal(getMintFlowCta({ phase: 'run', stepId: 'apprB' }).text, 'Approving BOX…')
  assert.equal(getMintFlowCta({ phase: 'run', stepId: 'p2' }).text, 'Signing Permit2…')
  assert.deepEqual(getMintFlowCta({ phase: 'run', stepId: 'mint' }), {
    text: 'Minting…',
    loading: true,
    disabled: true,
  })
  assert.deepEqual(getMintFlowCta({ phase: 'retry' }), {
    text: 'Retry',
    loading: false,
    disabled: false,
  })
  assert.deepEqual(getMintFlowCta({ phase: 'finish' }), {
    text: 'Finish',
    loading: false,
    disabled: false,
  })
  assert.deepEqual(createMintFlowFlags(), ['todo', 'todo', 'todo', 'todo'])
})

test('zh catalog renders mint-flow copy that matches the HTML prototype', () => {
  const { i18n } = require('@lingui/core')
  const { bindUsdxI18n } = require('./usdxI18n')
  const prevLocale = i18n.locale
  const prevMessages = i18n.messages
  try {
    const { messages } = require('../../locale/zh/messages.js')
    i18n.loadAndActivate({ locale: 'zh', messages })
    bindUsdxI18n(i18n)
    const rows = getMintFlowRows(['skip', 'skip', 'done', 'wait'])
    assert.deepEqual(
      rows.map((row) => [row.label, row.status]),
      [
        ['授权 USDT 给 Permit2', '无需处理'],
        ['授权 BOX 给 Permit2', '无需处理'],
        ['Permit2 签署授权 USDT 和 BOX', '已签名'],
        ['铸造 USDX', '等待钱包确认…'],
      ]
    )
    assert.equal(getMintFlowRows(['skip', 'skip', 'done', 'prep'])[3].status, '准备交易…')
    assert.equal(getMintFlowCta({ phase: 'idle' }).text, '确认铸造')
    assert.equal(getMintFlowCta({ phase: 'run', stepId: 'mint' }).text, '铸造中…')
    assert.equal(getMintFlowCta({ phase: 'retry' }).text, '重试')
    assert.equal(getMintFlowCta({ phase: 'finish' }).text, '完成')
    const slippageRows = getMintFlowRows(['skip', 'skip', 'todo', 'fail'], { failKind: 'slippage' })
    assert.equal(slippageRows[2].status, '请重新签名')
    assert.equal(slippageRows[3].status, 'BOX 价格已变化')
  } finally {
    i18n.loadAndActivate({ locale: prevLocale || 'en', messages: prevMessages || {} })
    require('./usdxI18n').bindUsdxI18n(i18n)
  }
})

test('mint sheet auto-finishes on success without waiting for Finish click', () => {
  assert.equal(shouldAutoFinishMint('finish'), true)
  assert.equal(shouldAutoFinishMint('retry'), false)
})

test('detects on-chain mint BOX slippage from viem revert copy', () => {
  assert.equal(
    isMintSlippageError({
      shortMessage: 'The contract function "mint" reverted with the following reason: Price slippage check',
    }),
    true
  )
  assert.equal(isMintSlippageError(new Error('proto: maxBoxIn')), true)
  assert.equal(isMintSlippageError(new Error('Invalid signature')), false)
})

test('treats LP minimum liquidity shortfall as a stale quote', () => {
  assert.equal(
    isMintSlippageError({
      shortMessage:
        'The contract function "mintWithMinLpLiquidity" reverted.\nError: MinLpLiquidityNotMet(uint128 actual, uint128 minimum)',
    }),
    true
  )
  const revertData = encodeErrorResult({
    abi: [parseAbiItem('error MinLpLiquidityNotMet(uint128 actual, uint128 minimum)')],
    errorName: 'MinLpLiquidityNotMet',
    args: [1n, 2n],
  })
  assert.equal(MIN_LP_LIQUIDITY_NOT_MET_SELECTOR, '0x4034807c')
  assert.equal(revertData.slice(0, 10), MIN_LP_LIQUIDITY_NOT_MET_SELECTOR)
  assert.equal(isMintSlippageError({ data: revertData }), true)
  assert.equal(isMintSlippageError({ data: '0xb8c32ffe' + revertData.slice(10) }), false)
  const mintIdx = MINT_FLOW_STEPS.findIndex((step) => step.id === 'mint')
  const p2Idx = MINT_FLOW_STEPS.findIndex((step) => step.id === 'p2')
  assert.equal(getMintRetryFromIndex(mintIdx, new Error('MinLpLiquidityNotMet(1, 2)')), p2Idx)
})

test('LP minimum liquidity applies 1% frontend tolerance to the quote', () => {
  assert.equal(MINT_LP_TOLERANCE_BPS, 100n)
  assert.equal(resolveMinLpLiquidity(1318240989253789276n), 1305058579361251383n)
  assert.equal(resolveMinLpLiquidity(10000n), 9900n)
  assert.equal(resolveMinLpLiquidity(199n), 197n)
})

test('LP minimum liquidity fails closed when quote or discounted value is not positive', () => {
  assert.equal(resolveMinLpLiquidity(0n), null)
  assert.equal(resolveMinLpLiquidity(undefined), null)
  assert.equal(resolveMinLpLiquidity(1n), null)
})

test('slippage on mint retries from Permit2 sign, other mint failures stay on mint', () => {
  const mintIdx = MINT_FLOW_STEPS.findIndex((step) => step.id === 'mint')
  const p2Idx = MINT_FLOW_STEPS.findIndex((step) => step.id === 'p2')
  assert.equal(getMintRetryFromIndex(mintIdx, new Error('Price slippage check')), p2Idx)
  assert.equal(getMintRetryFromIndex(mintIdx, new Error('user rejected')), mintIdx)
  assert.equal(getMintRetryFromIndex(p2Idx, new Error('Price slippage check')), p2Idx)
})

test('fresh quoteMint result rebuilds maxBoxIn with 1% buffer', () => {
  const boxIn = 216296371946096166481n
  const refreshed = applyMintQuoteRefresh({ boxIn, mintable: true })
  assert.equal(refreshed.ok, true)
  assert.equal(refreshed.boxIn, boxIn)
  assert.equal(refreshed.maxBoxIn, boxIn + boxIn / 100n)
  assert.equal(applyMintQuoteRefresh({ boxIn: 0n, mintable: true }).ok, false)
  assert.equal(applyMintQuoteRefresh({ boxIn, mintable: false }).ok, false)
  assert.equal(applyMintQuoteRefresh([boxIn, 0n, 0n, 0n, 0n, true]).ok, true)
})

test('mint write timeout stays on mint and is not treated as wallet cancel', () => {
  const mintIdx = MINT_FLOW_STEPS.findIndex((step) => step.id === 'mint')
  const timeout = Object.assign(new Error('Request timed out, please retry'), {
    name: 'MintFlowTimeoutError',
  })
  assert.equal(isMintFlowTimeoutError(timeout), true)
  assert.equal(isMintFlowTimeoutError(new Error('user rejected')), false)
  assert.equal(getMintRetryFromIndex(mintIdx, timeout), mintIdx)
  const rows = getMintFlowRows(['skip', 'skip', 'done', 'fail'], { failKind: 'chain' })
  assert.equal(rows[3].status, 'Failed, please retry')
})

test('withMintFlowTimeout rejects hung work and lets fast work through', async () => {
  assert.equal(MINT_FLOW_PREP_TIMEOUT_MS, 15000)
  assert.equal(MINT_FLOW_WRITE_TIMEOUT_MS, 180000)
  assert.equal(
    await withMintFlowTimeout(Promise.resolve('ok'), 20),
    'ok'
  )
  await assert.rejects(
    () => withMintFlowTimeout(new Promise(() => {}), 15),
    (error) => isMintFlowTimeoutError(error) && error.message === 'Request timed out, please retry'
  )
})

test('slippage retry UI asks to sign again instead of cancelled-in-wallet', () => {
  const rows = getMintFlowRows(['skip', 'skip', 'todo', 'fail'], { failKind: 'slippage' })
  assert.equal(rows[2].status, 'Sign again')
  assert.equal(rows[3].status, 'BOX price changed')
  const cancelled = getMintFlowRows(['skip', 'skip', 'done', 'fail'])
  assert.equal(cancelled[3].status, 'Cancelled in wallet')
  const chain = getMintFlowRows(['skip', 'skip', 'done', 'fail'], { failKind: 'chain' })
  assert.equal(chain[3].status, 'Failed, please retry')
})
