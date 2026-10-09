const test = require('node:test')
const assert = require('node:assert/strict')

const { getUsdxScreenView, SCREEN_VIEWS } = require('./screenRegistry')
const { USDX_SCREENS } = require('./screens')

test('all known screens map to a unique view and never placeholder', () => {
  const views = USDX_SCREENS.map(getUsdxScreenView)
  assert.equal(new Set(views).size, USDX_SCREENS.length)
  assert.equal(views.includes('placeholder'), false)
  assert.equal(getUsdxScreenView('s-unknown'), 'mint')
  assert.deepEqual(Object.keys(SCREEN_VIEWS).sort(), [...USDX_SCREENS].sort())
})
