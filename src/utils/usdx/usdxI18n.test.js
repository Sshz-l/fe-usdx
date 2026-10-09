const test = require('node:test')
const assert = require('node:assert/strict')
const { i18n } = require('@lingui/core')

const { bindUsdxI18n, usdxT } = require('./usdxI18n')
const { quoteSwapPreview } = require('./swapQuote')

test('usdxT falls back to the English msgid without a catalog', () => {
  assert.equal(usdxT('Submit order'), 'Submit order')
  assert.equal(
    usdxT('Insufficient {token} balance, max {amount}', { token: 'USDT', amount: '10' }),
    'Insufficient USDT balance, max 10'
  )
})

test('usdxT looks up hashed ids in the compiled zh catalog', () => {
  const prevLocale = i18n.locale
  const prevMessages = i18n.messages
  try {
    const { messages } = require('../../locale/zh/messages.js')
    i18n.loadAndActivate({ locale: 'zh', messages })
    bindUsdxI18n(i18n)
    assert.equal(usdxT('Submit order'), '提交挂单')
    assert.equal(usdxT('Approve USDT for Permit2'), '授权 USDT 给 Permit2')
    assert.equal(usdxT('No action needed'), '无需处理')
    assert.equal(usdxT('Minting…'), '铸造中…')
    assert.equal(usdxT('Finish'), '完成')
    assert.equal(usdxT('Swap'), '兑换')
    assert.equal(usdxT('Free'), '免费')
    assert.equal(usdxT('Minimum buy is 0.01 USDT'), '最低买入 0.01 USDT')
    assert.equal(usdxT('Minimum sell is 1 USDX'), '最低卖出 1 USDX')
    assert.equal(
      usdxT('Insufficient {token} balance, max {amount}', { token: 'USDT', amount: '10' }),
      'USDT 余额不足，最多可兑换 10'
    )
    const q = quoteSwapPreview('X2U', '100', 200n * 10n ** 18n)
    assert.equal(q.cta, '提交挂单')
    assert.equal(q.feeLabel, '0.1%-0.5%')
  } finally {
    i18n.loadAndActivate({ locale: prevLocale || 'en', messages: prevMessages || {} })
    bindUsdxI18n(i18n)
  }
})

test('usdxT follows the I18nProvider instance after bindUsdxI18n', () => {
  const { setupI18n } = require('@lingui/core')
  const { messages } = require('../../locale/zh/messages.js')
  const providerI18n = setupI18n()
  providerI18n.loadAndActivate({ locale: 'zh', messages })
  bindUsdxI18n(providerI18n)
  try {
    assert.equal(usdxT('Submit order'), '提交挂单')
  } finally {
    bindUsdxI18n(i18n)
  }
})
