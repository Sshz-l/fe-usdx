const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const { getUsdxSharedStyleUrl, USDX_SHARED_STYLE_CACHE } = require('./sharedAssets')

test('USDX shared CSS URLs carry a cache key so hashed-less files bust CDN/WebView', () => {
  assert.equal(
    getUsdxSharedStyleUrl('', 'usdx-page.css', '3.17.95'),
    `/usdx/shared/usdx-page.css?v=3.17.95-${USDX_SHARED_STYLE_CACHE}`
  )
  assert.equal(
    getUsdxSharedStyleUrl('https://cdn.example', 'tokens.css', '3.17.95'),
    `https://cdn.example/usdx/shared/tokens.css?v=3.17.95-${USDX_SHARED_STYLE_CACHE}`
  )
})

test('USDX shared CSS URLs still bust when package version is missing', () => {
  assert.equal(
    getUsdxSharedStyleUrl('', 'components.css', ''),
    `/usdx/shared/components.css?v=${USDX_SHARED_STYLE_CACHE}`
  )
})

test('UsdxHead loads shared styles through the cache-busted helper', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../components/Usdx/UsdxHead.tsx'),
    'utf8'
  )
  assert.match(source, /getUsdxSharedStyleUrl\(/)
  assert.doesNotMatch(source, /href=\{`\$\{cdnPrefix\}\/usdx\/shared\/[^`]+\.css`\}/)
})

test('USDX stylesheets are declared at page level so static HTML ships them before first paint', () => {
  const page = fs.readFileSync(path.join(__dirname, '../../pages/index.tsx'), 'utf8')
  const app = fs.readFileSync(path.join(__dirname, '../../components/Usdx/UsdxApp.tsx'), 'utf8')
  assert.match(page, /<UsdxHead\s*\/>/)
  assert.doesNotMatch(page, /dynamic\([^)]*UsdxHead/)
  assert.doesNotMatch(app, /rel="stylesheet"/)
  assert.match(page, /loading:\s*\(\)\s*=>\s*<UsdxSkeleton\s*\/>/)
})

test('statically rendered USDX inline styles avoid text children (quotes get escaped to &quot;)', () => {
  for (const file of ['UsdxHead.tsx', 'UsdxSkeleton.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '../../components/Usdx', file), 'utf8')
    assert.match(source, /<style[^>]*dangerouslySetInnerHTML/, file)
    assert.doesNotMatch(source, /<style[^>]*>\{/, file)
  }
})
