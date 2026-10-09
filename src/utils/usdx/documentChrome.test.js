const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getUsdxThemeFromSearch,
  shouldUsdxBarScrolled,
  applyUsdxBodyScreen,
  applyUsdxBodyScrolled,
  applyUsdxHtmlTheme,
} = require('./documentChrome')

const makeEl = (attrs = {}) => {
  const store = { ...attrs }
  return {
    getAttribute: (name) => (Object.prototype.hasOwnProperty.call(store, name) ? store[name] : null),
    setAttribute: (name, value) => {
      store[name] = value
    },
    removeAttribute: (name) => {
      delete store[name]
    },
    attrs: store,
  }
}

test('theme query matches the HTML prototype', () => {
  assert.equal(getUsdxThemeFromSearch('?theme=dark'), 'dark')
  assert.equal(getUsdxThemeFromSearch('theme=dark'), 'dark')
  assert.equal(getUsdxThemeFromSearch('?theme=light'), 'light')
  assert.equal(getUsdxThemeFromSearch(''), 'light')
})

test('sticky bars use the HTML scroll threshold of 4px', () => {
  assert.equal(shouldUsdxBarScrolled(0), false)
  assert.equal(shouldUsdxBarScrolled(4), false)
  assert.equal(shouldUsdxBarScrolled(5), true)
})

test('body data-screen drives primary-tab CSS', () => {
  const body = makeEl()
  applyUsdxBodyScreen('s-mint', body)
  assert.equal(body.getAttribute('data-screen'), 's-mint')
  applyUsdxBodyScreen('s-redeem', body)
  assert.equal(body.getAttribute('data-screen'), 's-redeem')
})

test('body data-scrolled is a flag attribute', () => {
  const body = makeEl()
  applyUsdxBodyScrolled(true, body)
  assert.equal(body.getAttribute('data-scrolled'), '')
  applyUsdxBodyScrolled(false, body)
  assert.equal(body.getAttribute('data-scrolled'), null)
})

test('html data-theme=dark is applied and cleared without inventing light', () => {
  const html = makeEl({ 'data-theme': 'light' })
  applyUsdxHtmlTheme('dark', html)
  assert.equal(html.getAttribute('data-theme'), 'dark')
  applyUsdxHtmlTheme('light', html)
  assert.equal(html.getAttribute('data-theme'), null)
})
