const shortUsdxAddr = (address) => {
  if (!address) return '—'
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

const getUsdxTokenExplorerUrl = (address) => {
  if (!address) return null
  return `https://bscscan.com/token/${address}`
}

const getUsdxAddressExplorerUrl = (address) => {
  if (!address) return null
  return `https://bscscan.com/address/${address}`
}

module.exports = {
  shortUsdxAddr,
  getUsdxTokenExplorerUrl,
  getUsdxAddressExplorerUrl,
}
