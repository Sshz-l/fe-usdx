const test = require('node:test')
const assert = require('node:assert/strict')

const {
  formatTokenAmount,
  formatTokenAmountFixed,
  formatBalanceDisplayText,
  getBalanceReadState,
  getBooleanReadState,
  getDepositErrorMessage,
  parseDepositD,
  parseTokenAmount,
} = require('./amounts')

test('parseDepositD converts the minimum D into exact 18-decimal halves', () => {
  assert.deepEqual(parseDepositD('1'), {
    ok: true,
    d: 10n ** 18n,
    usdtIn: 5n * 10n ** 17n,
  })
})

test('parseDepositD rejects deposits below one D', () => {
  assert.deepEqual(parseDepositD('0.5'), { ok: false, code: 'below-minimum' })
})

test('parseDepositD rejects values whose minimum unit cannot be divided in half', () => {
  assert.deepEqual(parseDepositD('1.000000000000000001'), {
    ok: false,
    code: 'odd-minimum-unit',
  })
})

test('parseDepositD rejects exponent notation', () => {
  assert.deepEqual(parseDepositD('1e3'), { ok: false, code: 'invalid-format' })
})

test('parseTokenAmount accepts an exact 18-decimal token amount', () => {
  assert.deepEqual(parseTokenAmount('12.123456789012345678'), {
    ok: true,
    amount: 12123456789012345678n,
  })
})

test('parseTokenAmount keeps small legal decimals as exact bigint values', () => {
  assert.deepEqual(parseTokenAmount('0.0000001'), { ok: true, amount: 100000000000n })
  assert.deepEqual(parseTokenAmount('0.000000000000000001'), { ok: true, amount: 1n })
})

test('formatTokenAmount renders minimum units without exponent notation', () => {
  assert.equal(formatTokenAmount(100000000000n), '0.0000001')
  assert.equal(formatTokenAmount(1n), '0.000000000000000001')
})

test('formatTokenAmountFixed keeps two decimals for slider fill', () => {
  assert.equal(formatTokenAmountFixed(10n ** 18n), '1.00')
  assert.equal(formatTokenAmountFixed(15n * 10n ** 17n), '1.50')
  assert.equal(formatTokenAmountFixed(123456789012345678n), '0.12')
  assert.equal(formatTokenAmountFixed(0n), '0.00')
})

test('getBalanceReadState distinguishes loading, failure, unavailable, and real zero', () => {
  assert.deepEqual(getBalanceReadState(null, true, false), {
    status: 'loading',
    amount: null,
  })
  assert.deepEqual(getBalanceReadState(null, false, true), {
    status: 'error',
    amount: null,
  })
  assert.deepEqual(getBalanceReadState(null, false, false), {
    status: 'error',
    amount: null,
  })
  assert.deepEqual(getBalanceReadState(0n, false, false), {
    status: 'ready',
    amount: 0n,
  })
  assert.deepEqual(getBalanceReadState(5n, false, true), {
    status: 'error',
    amount: null,
  })
})

test('formatBalanceDisplayText keeps unread balances off the fake-zero path', () => {
  const formatReady = (amount) => `fmt:${amount}`
  assert.equal(formatBalanceDisplayText({ status: 'loading', amount: null }, formatReady), '…')
  assert.equal(formatBalanceDisplayText({ status: 'error', amount: null }, formatReady), '—')
  assert.equal(formatBalanceDisplayText({ status: 'ready', amount: 0n }, formatReady), 'fmt:0')
  assert.equal(formatBalanceDisplayText({ status: 'ready', amount: 5n }, formatReady), 'fmt:5')
})

test('getBooleanReadState rejects unknown and stale cached values after refetch failure', () => {
  assert.deepEqual(getBooleanReadState(undefined, true, false), {
    status: 'loading',
    value: null,
  })
  assert.deepEqual(getBooleanReadState(true, false, true), {
    status: 'error',
    value: null,
  })
  assert.deepEqual(getBooleanReadState(false, false, false), {
    status: 'ready',
    value: false,
  })
})

test('deposit error codes map to the authoritative UI copy', () => {
  assert.equal(getDepositErrorMessage('below-minimum'), 'Minimum deposit is 1 USDT')
  assert.equal(getDepositErrorMessage('odd-minimum-unit'), 'Too many decimals, please reduce by one digit')
  assert.equal(getDepositErrorMessage('invalid-format'), 'Enter a valid amount')
})

test('parseTokenAmount rejects excess precision, commas, and empty input', () => {
  for (const input of ['1.0000000000000000001', '1,000', '']) {
    assert.deepEqual(parseTokenAmount(input), { ok: false, code: 'invalid-format' })
  }
})
