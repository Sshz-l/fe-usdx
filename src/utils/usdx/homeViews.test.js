const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getRedeemable,
  getHomeHero,
  getProtocolCoverage,
  getProtocolDashboard,
  getMintUnavailableReason,
  formatUsdxAmount,
  formatUsdxUsd,
  formatUsdxPct,
} = require('./homeViews')

const WAD = 10n ** 18n
const asWad = (n) => BigInt(n) * WAD

const SCREENSHOT_PROTO = {
  U: asWad(700_000),
  B: asWad(20_000_000),
  P: 35n * 10n ** 15n,
  Sr: asWad(1_000_000),
  Etotal: asWad(1_400_000),
  T: asWad(1_400_000),
  mode: 0,
}

test('redeemable uses wallet only and never total', () => {
  const view = {
    wallet: 45n * 10n ** 18n,
    claimable: 20n * 10n ** 18n,
    remainingLock: 80n * 10n ** 18n,
    unminted: 100n * 10n ** 18n,
    total: 145n * 10n ** 18n,
    positionCount: 2n,
  }
  assert.equal(getRedeemable(view), view.wallet)
  assert.notEqual(getRedeemable(view), view.total)
})

test('home hero splits claimable / remainingLock / wallet', () => {
  const view = {
    wallet: 10n * 10n ** 18n,
    claimable: 2n * 10n ** 18n,
    remainingLock: 8n * 10n ** 18n,
    unminted: 10n * 10n ** 18n,
    total: 20n * 10n ** 18n,
    positionCount: 1n,
  }
  const hero = getHomeHero(view)
  assert.equal(hero.total, view.total)
  assert.equal(hero.claimable, view.claimable)
  assert.equal(hero.remainingLock, view.remainingLock)
  assert.equal(hero.wallet, view.wallet)
  assert.equal(hero.hasPosition, true)
  assert.equal(hero.canClaim, true)
})

test('coverage is T/Sr and T/(Sr+Etotal); missing price yields null', () => {
  const proto = {
    U: 0n,
    B: 0n,
    P: 10n ** 18n,
    Sr: 100n * 10n ** 18n,
    Etotal: 50n * 10n ** 18n,
    T: 90n * 10n ** 18n,
    mode: 0,
  }
  const cov = getProtocolCoverage(proto)
  assert.equal(cov.current, 0.9)
  assert.equal(cov.fullyDiluted, 0.6)
  assert.equal(getProtocolCoverage({ ...proto, P: 0n }).current, null)
})

test('format helpers keep empty placeholders', () => {
  assert.equal(formatUsdxAmount(null), '—')
  assert.match(formatUsdxAmount(10n * 10n ** 18n), /10/)
  assert.equal(formatUsdxPct(null), '—')
  assert.equal(formatUsdxPct(0.9), '90.00%')
  assert.equal(formatUsdxAmount(0.5), '0.50')
  assert.equal(formatUsdxAmount(1.4, 4), '1.4000')
  assert.equal(formatUsdxAmount(0.035, 5), '0.03500')
})

test('formatUsdxUsd keeps decimals for small treasury amounts', () => {
  assert.equal(formatUsdxUsd(null), '—')
  assert.equal(formatUsdxUsd(0.5494890344785175), '$0.55')
  assert.equal(formatUsdxUsd(asWad(1_400_000)), '$1,400,000')
})

test('formatUsdxMoney keeps two decimals for sub-1 token amounts', () => {
  const { formatUsdxMoney } = require('./homeViews')
  assert.equal(formatUsdxMoney(4n * 10n ** 17n), '0.40')
  assert.equal(formatUsdxMoney(8n * 10n ** 17n), '0.80')
  assert.equal(formatUsdxMoney(0n), '0.00')
  assert.equal(formatUsdxMoney(asWad(100)), '100')
  assert.equal(formatUsdxMoney(asWad(1_000_000)), '1,000,000')
})

test('formatUsdxTradeAmount mirrors RN formatTradeAmountAdaptive', () => {
  const { formatUsdxTradeAmount } = require('./homeViews')
  const WAD = 10n ** 18n
  assert.equal(formatUsdxTradeAmount(0n), '0')
  assert.equal(formatUsdxTradeAmount(4n * 10n ** 17n), '0.4')
  assert.equal(formatUsdxTradeAmount(5n * 10n ** 17n), '0.5')
  assert.equal(formatUsdxTradeAmount(1234567n * WAD / 10000n), '123')
  assert.equal(formatUsdxTradeAmount(32000n * WAD), '32,000')
  assert.equal(formatUsdxTradeAmount(999n * 10n ** 15n), '0.999')
})

test('formatUsdxSwapFeeAmount keeps tiny sell fees visible', () => {
  const { formatUsdxSwapFeeAmount } = require('./homeViews')
  assert.equal(formatUsdxSwapFeeAmount(4n * 10n ** 13n), '0.00004')
  assert.equal(formatUsdxSwapFeeAmount(10n ** 13n), '0.00001')
  assert.equal(formatUsdxSwapFeeAmount(0n), '0')
  assert.equal(formatUsdxSwapFeeAmount(15n * 10n ** 16n), '0.15')
})

test('formatUsdxReleaseAmount keeps 4dp for early release under 0.01', () => {
  const { formatUsdxReleaseAmount } = require('./homeViews')
  assert.equal(formatUsdxReleaseAmount(2880000000000000n), '0.0029')
  assert.equal(formatUsdxReleaseAmount(0n), '0.00')
  assert.equal(formatUsdxReleaseAmount(8n * 10n ** 17n), '0.80')
})

test('claimable hero amount is green only when > 0, else wallet-balance gray', () => {
  const { getClaimableStatClass } = require('./homeViews')
  assert.equal(getClaimableStatClass(0n), 'subtle')
  assert.equal(getClaimableStatClass(1n), 'pos')
  assert.equal(getClaimableStatClass(asWad(2)), 'pos')
})

test('formatUsdxClaimableBadge matches mine menu: large ints 0dp, sub-dollar 2dp, early 4dp', () => {
  const { formatUsdxClaimableBadge } = require('./homeViews')
  assert.equal(formatUsdxClaimableBadge(asWad(3240)), '3,240')
  assert.equal(formatUsdxClaimableBadge(17n * 10n ** 16n), '0.17')
  assert.equal(formatUsdxClaimableBadge(2880000000000000n), '0.0029')
  assert.equal(formatUsdxClaimableBadge(0n), '0.00')
})

test('protocol dashboard matches screenshot 1:1 copy and numbers', () => {
  const d = getProtocolDashboard(SCREENSHOT_PROTO)
  assert.equal(formatUsdxAmount(d.nav, 4), '1.4000')
  assert.equal(d.modeLabel, 'Treasury can redeem 1:1')
  assert.equal(formatUsdxAmount(d.treasury, 0), '1,400,000')
  assert.equal(formatUsdxAmount(d.supply, 0), '1,000,000')
  assert.equal(formatUsdxPct(d.coverageCurrent), '140.00%')
  assert.equal(d.coverTone, 'pos')
  assert.equal(formatUsdxPct(d.coverageFd), '58.33%')
  assert.equal(`${formatUsdxAmount(d.etotal, 0)} USDX`, '1,400,000 USDX')
  assert.equal(`${formatUsdxAmount(d.fullyDilutedSupply, 0)} USDX`, '2,400,000 USDX')
  assert.equal(formatUsdxAmount(d.u, 0), '700,000')
  assert.equal(formatUsdxAmount(d.b, 0), '20,000,000')
  assert.equal(`$${formatUsdxAmount(d.price, 5)}`, '$0.03500')
})

test('protocol treasury liquidity uses money adaptive decimals like HTML fmtNum', () => {
  const { formatUsdxMoney } = require('./homeViews')
  const d = getProtocolDashboard({
    U: 65n * 10n ** 16n,
    B: 2357n * 10n ** 16n,
    P: 10n ** 18n,
    Sr: 1n * 10n ** 18n,
    Etotal: 0n,
    T: 1n * 10n ** 18n,
    mode: 0,
  })
  assert.equal(formatUsdxMoney(d.u), '0.65')
  assert.equal(formatUsdxMoney(d.b), '23.57')
  assert.equal(formatUsdxMoney(SCREENSHOT_PROTO.U), '700,000')
  assert.equal(formatUsdxMoney(SCREENSHOT_PROTO.B), '20,000,000')
})

test('protocol mode label follows T vs Sr even when coverage is unavailable', () => {
  const zeroSupply = getProtocolDashboard({
    ...SCREENSHOT_PROTO,
    Sr: 0n,
    T: asWad(1),
  })
  assert.equal(zeroSupply.nav, null)
  assert.equal(zeroSupply.modeLabel, 'Treasury can redeem 1:1')
})

test('protocol dashboard discount and missing price copy', () => {
  const discount = getProtocolDashboard({
    ...SCREENSHOT_PROTO,
    T: asWad(900_000),
  })
  assert.equal(discount.coverTone, 'warn')
  assert.equal(discount.modeLabel, 'Treasury is below face-value liabilities; redeem at NAV')

  const missing = getProtocolDashboard({ ...SCREENSHOT_PROTO, P: 0n })
  assert.equal(missing.nav, null)
  assert.equal(missing.treasury, null)
  assert.equal(missing.price, null)
  assert.equal(missing.coverTone, '')
  assert.equal(missing.modeLabel, 'BOX mark price unavailable; redeem by share × 99.5%')
  assert.equal(formatUsdxAmount(missing.supply, 0), '1,000,000')

  const empty = getProtocolDashboard(null)
  assert.equal(empty.modeLabel, '—')
  assert.equal(empty.supply, null)
  assert.equal(empty.u, null)
})

test('mint gate does not treat loading or rpc miss as paused', () => {
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      protocolLoading: true,
      priceOk: false,
    }),
    'loading'
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      pauseConfigError: true,
      quoteMintable: true,
      protocolLoaded: true,
      priceOk: true,
    }),
    'rpc'
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      pauseConfigLoading: true,
      quoteMintable: true,
      protocolLoaded: true,
      priceOk: true,
    }),
    'loading'
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      protocolError: true,
      protocolLoaded: false,
      priceOk: false,
    }),
    'rpc'
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
      protocolError: true,
      priceOk: false,
      quoteMintable: true,
    }),
    null
  )
  assert.equal(
    getMintUnavailableReason({
      hasConfig: true,
      pauseMint: false,
      protocolLoaded: true,
      priceOk: true,
      quoteMintable: false,
    }),
    'unmintable'
  )
})
