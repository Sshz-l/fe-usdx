const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildKeys,
  extractApiPath,
  formatErr,
  hash8,
  inferErrReason,
  sanitizeRequestId,
} = require('./h5LoggerFields')

test('sanitizeRequestId accepts valid server ids', () => {
  assert.equal(sanitizeRequestId('R2f9a8c1d'), 'R2f9a8c1d')
  assert.equal(sanitizeRequestId('  abc-123_xyz  '), 'abc-123_xyz')
})

test('sanitizeRequestId rejects invalid ids', () => {
  assert.equal(sanitizeRequestId(''), undefined)
  assert.equal(sanitizeRequestId('bad id!'), undefined)
  assert.equal(sanitizeRequestId(undefined), undefined)
})

test('extractApiPath strips query and leading slashes', () => {
  assert.equal(extractApiPath('/debox/check_token?foo=1'), 'debox/check_token')
  assert.equal(extractApiPath('debox/user/info'), 'debox/user/info')
})

test('hash8 is FNV-1a 8 hex (matches RN packages/logger/errFields)', () => {
  assert.equal(hash8('abc'), hash8('abc'))
  assert.match(hash8('abc'), /^[0-9a-f]{8}$/)
  assert.notEqual(hash8('abc'), hash8('abd'))
  // 与截断短地址不同：完整地址指纹不可被区块浏览器直接反查为 0xabcd…ef12 形式
  const addr = '0x742d35Cc6634C0532925a3b844Bc9e7595f44e'
  assert.match(hash8(addr), /^[0-9a-f]{8}$/)
  assert.notEqual(hash8(addr), '742df44e')
  assert.equal(hash8(''), undefined)
  assert.equal(hash8(undefined), undefined)
})

test('inferErrReason covers wallet/network/gas paths', () => {
  assert.equal(inferErrReason('User rejected the request'), 'user_rejected')
  assert.equal(inferErrReason('insufficient funds for gas * price + value'), 'insufficient_gas')
  assert.equal(inferErrReason('insufficient funds for transfer'), 'insufficient_balance')
  assert.equal(inferErrReason('Failed to fetch'), 'network')
  assert.equal(inferErrReason('confirmation timeout'), 'confirmation_timeout')
  assert.equal(inferErrReason('slippage too high'), 'slippage')
  assert.equal(inferErrReason('boom'), null)
})

test('formatErr uses fallbackReason when inference is unknown', () => {
  assert.equal(formatErr(new Error('User rejected the request')), 'Error:user_rejected')
  assert.equal(formatErr(new Error('boom'), 'login_fail'), 'Error:login_fail')
  assert.equal(formatErr(new Error('boom'), 'handle_failed'), 'Error:handle_failed')
  assert.equal(formatErr('plain'), 'Error:unknown')
})

test('buildKeys prefers event then caps at 10', () => {
  const many = {}
  for (let i = 0; i < 12; i++) many[`k${i}`] = i
  many.event = 'late_event'
  const keys = buildKeys(many)
  assert.equal(keys[0], 'event=late_event')
  assert.equal(keys.length, 10)
  assert.deepEqual(
    buildKeys({
      event: 'req_done',
      ok: false,
      code: -95,
      empty: '',
      missing: undefined,
    }),
    ['event=req_done', 'ok=false', 'code=-95']
  )
})
