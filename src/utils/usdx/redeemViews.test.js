const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const {
  asRedeemQuote,
  getRedeemDisplay,
  getRedeemMax,
  getRedeemSubmitGate,
  getRedeemTotalValue,
} = require('./redeemViews')

const WAD = 10n ** 18n
const asToken = (n) => BigInt(n) * WAD

const named = {
  mode: 0,
  usdtOut: 995n * 10n ** 15n,
  boxOut: 10n * WAD,
  feeUsdt: 5n * 10n ** 15n,
  feeBox: 0n,
  dWad: WAD,
  valueAvailable: true,
}

const tuple = [
  named.mode,
  named.usdtOut,
  named.boxOut,
  named.feeUsdt,
  named.feeBox,
  named.dWad,
  named.valueAvailable,
]

test('redeem ABI uses the deployed Signature tuple selector', () => {
  const abiSource = fs.readFileSync(
    path.resolve(__dirname, '../../abis/usdx/diamondAbi.ts'),
    'utf8'
  )
  const marker = 'const usdxDiamondCoreAbi = '
  const start = abiSource.indexOf(marker)
  assert.ok(start >= 0)
  const arrStart = abiSource.indexOf('[', start)
  let depth = 0
  let end = -1
  for (let i = arrStart; i < abiSource.length; i++) {
    if (abiSource[i] === '[') depth++
    else if (abiSource[i] === ']') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const abi = JSON.parse(abiSource.slice(arrStart, end + 1))
  const redeem = abi.find((item) => item.type === 'function' && item.name === 'redeem')
  assert.ok(redeem)
  assert.equal(redeem.inputs[1]?.name, 'sig')
  assert.equal(redeem.inputs[1]?.type, 'tuple')
  assert.deepEqual(
    redeem.inputs[1].components.map((item) => `${item.type} ${item.name}`),
    ['uint256 deadline', 'uint8 v', 'bytes32 r', 'bytes32 s']
  )
})

test('quoteRedeem maps both named objects and tuples', () => {
  assert.deepEqual(asRedeemQuote(named), {
    mode: 0,
    usdtOut: named.usdtOut,
    boxOut: named.boxOut,
    feeUsdt: named.feeUsdt,
    feeBox: named.feeBox,
    dWad: named.dWad,
    valueAvailable: true,
  })
  assert.deepEqual(asRedeemQuote(tuple), asRedeemQuote(named))
})

test('normal, discount, and fallback copy stay distinct', () => {
  const amount = asToken(10000)
  const normal = getRedeemDisplay({ ...named, mode: 0 }, { amount })
  const discount = getRedeemDisplay(
    { ...named, mode: 1, dWad: (9n * WAD) / 10n, valueAvailable: true },
    { amount }
  )
  const fallback = getRedeemDisplay(
    {
      ...named,
      mode: 2,
      valueAvailable: false,
    },
    { amount }
  )

  assert.equal(normal.modeKey, 'normal')
  assert.match(normal.modeHtml, /Redeemed at face value/)
  assert.equal(normal.showTotalValue, true)
  assert.equal(normal.showNoPriceHint, false)
  assert.equal(discount.modeKey, 'discount')
  assert.match(discount.modeHtml, /redeem pro rata at NAV/)
  assert.doesNotMatch(discount.modeHtml, /Redeemed at face value/)
  assert.equal(discount.showTotalValue, true)
  assert.equal(fallback.modeKey, 'fallback')
  assert.match(fallback.modeHtml, /share × 99.5%/)
  assert.equal(fallback.showTotalValue, false)
  assert.equal(fallback.showNoPriceHint, true)
})

test('total value follows HTML redeemQuote (not dWad)', () => {
  const amount = asToken(10000)
  /* normal: 10000 * 0.995 = 9950 */
  assert.equal(
    getRedeemTotalValue(amount, { ...named, mode: 0, dWad: WAD, valueAvailable: true }),
    asToken(9950)
  )
  /* discount d=0.9: 0.995 * 0.81 * 10000 = 8059.5 */
  assert.equal(
    getRedeemTotalValue(amount, {
      ...named,
      mode: 1,
      dWad: (9n * WAD) / 10n,
      valueAvailable: true,
    }),
    asToken(8059) + WAD / 2n
  )
  assert.equal(
    getRedeemTotalValue(amount, { ...named, mode: 2, valueAvailable: false }),
    null
  )
  const display = getRedeemDisplay(
    { ...named, mode: 0, dWad: WAD, valueAvailable: true },
    { amount }
  )
  assert.equal(display.totalValue, asToken(9950))
  assert.notEqual(display.totalValue, WAD)
})

test('empty amount still toggles total row by priceOk / valueAvailable', () => {
  const priced = getRedeemDisplay(null, { amount: 0n, priceOk: true })
  assert.equal(priced.showTotalValue, true)
  assert.equal(priced.showNoPriceHint, false)
  assert.equal(priced.totalValue, null)

  const noprice = getRedeemDisplay(null, { amount: 0n, priceOk: false })
  assert.equal(noprice.modeKey, 'fallback')
  assert.equal(noprice.showTotalValue, false)
  assert.equal(noprice.showNoPriceHint, true)
})

test('redeem results always expose USDT and BOX rows', () => {
  const display = getRedeemDisplay(named, { amount: asToken(1) })
  assert.deepEqual(
    display.rows.map((row) => row.sym),
    ['USDT', 'BOX']
  )
  assert.equal(display.rows[0].amount, named.usdtOut)
  assert.equal(display.rows[1].amount, named.boxOut)
})

test('redeem max is wallet, never total, and pause blocks submit', () => {
  const wallet = 45n * WAD
  const total = 145n * WAD
  assert.equal(getRedeemMax({ wallet, total }), wallet)
  assert.notEqual(getRedeemMax({ wallet, total }), total)
  assert.equal(
    getRedeemSubmitGate({ pauseRedeem: true, amount: WAD, wallet }),
    'pause'
  )
  assert.equal(
    getRedeemSubmitGate({ pauseRedeem: false, amount: WAD, wallet }),
    null
  )
  assert.equal(
    getRedeemSubmitGate({ pauseRedeem: false, amount: wallet + 1n, wallet }),
    'over'
  )
})

test('redeem success toast matches HTML copy', () => {
  const { formatRedeemSuccessMessage } = require('./redeemViews')
  const { formatUsdxAmount } = require('./homeViews')
  assert.equal(
    formatRedeemSuccessMessage(named),
    `Redeemed ${formatUsdxAmount(named.usdtOut, 2)} USDT and ${formatUsdxAmount(named.boxOut, 2)} BOX`
  )
})
