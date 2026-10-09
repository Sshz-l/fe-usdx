const test = require('node:test')
const assert = require('node:assert/strict')

const { getUsdxAddressExplorerUrl, getUsdxTokenExplorerUrl, shortUsdxAddr } = require('./contractViews')

test('shortUsdxAddr uses the HTML shortAddr 6…4 ellipsis', () => {
  assert.equal(shortUsdxAddr('0x7c060Aff8631dd82dd44F6110D6E6BB29b88d5c5'), '0x7c06…d5c5')
})

test('shortUsdxAddr shows an em dash when the token address is missing', () => {
  assert.equal(shortUsdxAddr(undefined), '—')
  assert.equal(shortUsdxAddr(''), '—')
})

test('getUsdxTokenExplorerUrl opens the BscScan token page', () => {
  assert.equal(
    getUsdxTokenExplorerUrl('0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D'),
    'https://bscscan.com/token/0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D'
  )
})

test('getUsdxTokenExplorerUrl is empty without a deploy address', () => {
  assert.equal(getUsdxTokenExplorerUrl(undefined), null)
  assert.equal(getUsdxTokenExplorerUrl(''), null)
})

test('getUsdxAddressExplorerUrl opens the BscScan address page', () => {
  assert.equal(
    getUsdxAddressExplorerUrl('0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D'),
    'https://bscscan.com/address/0x181C07B8E332ed339eC8Cb31773400e74ca9dD8D'
  )
})

test('getUsdxAddressExplorerUrl is empty without a wallet address', () => {
  assert.equal(getUsdxAddressExplorerUrl(undefined), null)
  assert.equal(getUsdxAddressExplorerUrl(''), null)
})
