const test = require('node:test')
const assert = require('node:assert/strict')

const {
  USDX_MINT_K,
  USDX_MIN_MINT_D,
  getMintGateCopy,
  parseMintAmount,
  quoteMintPreview,
} = require('./mintQuote')
const { parseDepositD } = require('./amounts')
const { getMintUnavailableReason, getPriceSheetHighlight } = require('./homeViews')

test('mint quote credits nothing immediately: L0 = M = 1.2D with 20% premium', () => {
  const q = quoteMintPreview(100, 0.05)
  assert.equal(q.D, 100)
  assert.equal(q.usdtIn, 50)
  assert.equal(q.boxIn, 1000)
  assert.equal('A' in q, false)
  assert.equal(q.L0, 120)
  assert.equal(q.M, 120)
  assert.equal(q.M, 100 * USDX_MINT_K)
  assert.equal(USDX_MIN_MINT_D, 1)
})

test('mint 1000 releases 3.6 USDX daily (0.3% of the full 120% lock)', () => {
  const q = quoteMintPreview(1000, 0.05)
  assert.equal(q.L0, 1200)
  assert.equal(Number(q.R.toFixed(6)), 3.6)
})

test('empty mint input stays zero and hides daily release', () => {
  const q = quoteMintPreview('', null)
  assert.equal(q.D, 0)
  assert.equal(q.L0, 0)
  assert.equal(q.R, 0)
  assert.equal(q.boxIn, 0)
  assert.equal(parseMintAmount('0'), 0)
})

test('getMintLocalPreview matches HTML empty and D=10000', () => {
  const { getMintLocalPreview } = require('./mintQuote')
  const WAD = 10n ** 18n
  assert.deepEqual(getMintLocalPreview(0n), { M: 0n, L0: 0n, R: 0n })
  const p = getMintLocalPreview(10000n * WAD)
  assert.equal(p.L0, 12000n * WAD)
  assert.equal(p.M, 12000n * WAD)
  assert.equal(p.R, 36n * WAD)
})

test('mint D>=1 and odd-minimum-unit errors stay exact without silent rounding', () => {
  assert.equal(parseDepositD('1').ok, true)
  assert.equal(parseDepositD('0.5').code, 'below-minimum')
  assert.equal(parseDepositD('1.000000000000000001').code, 'odd-minimum-unit')
})

test('quote mintable=false is distinct from pause, missing price, and rpc failure', () => {
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      quoteMintable: false,
    }),
    'unmintable'
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: true,
      quoteMintable: true,
    }),
    'pause'
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      protocolLoaded: true,
      priceOk: false,
    }),
    'price'
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      protocolError: true,
    }),
    'rpc'
  )
})

test('mint gate codes map to UI copy', () => {
  assert.equal(getMintGateCopy('config'), 'USDX minting is not enabled in this environment')
  assert.equal(getMintGateCopy('pause'), 'Minting paused')
  assert.equal(getMintGateCopy('price'), 'BOX mark price is unavailable, minting paused')
  assert.equal(getMintGateCopy('rpc'), 'Failed to read protocol status, please refresh')
  assert.equal(getMintGateCopy('quote'), 'Failed to fetch quote, please try again')
  assert.equal(getMintGateCopy('unmintable'), 'Minting is unavailable, please try again later')
  assert.equal(getMintGateCopy('loading'), '')
})

test('price sheet highlight is none when price is missing and otherwise stays neutral', () => {
  assert.equal(getPriceSheetHighlight(false), 'none')
  assert.equal(getPriceSheetHighlight(true), 'neutral')
  assert.equal(getPriceSheetHighlight(null), 'neutral')
})
