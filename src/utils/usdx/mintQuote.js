const { formatUnits } = require('viem')
const { usdxT } = require('./usdxI18n')

/** 铸造时不立即到账：M = 1.2D 全额记为待解锁 L0，按 L0 × 0.3% 每日释放 */
const USDX_MINT_K = 1.2
const USDX_MINT_R_RATE = 0.003
const USDX_MIN_MINT_D = 1

const MINT_GATE_COPY = {
  config: 'USDX minting is not enabled in this environment',
  pause: 'Minting paused',
  price: 'BOX mark price is unavailable, minting paused',
  rpc: 'Failed to read protocol status, please refresh',
  quote: 'Failed to fetch quote, please try again',
  unmintable: 'Minting is unavailable, please try again later',
  loading: '',
}

const getMintGateCopy = (code) => {
  const text = MINT_GATE_COPY[code] || ''
  return text ? usdxT(text) : ''
}

const parseMintAmount = (value) => {
  const n = parseFloat(String(value || '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

const wadToNumber = (value) => {
  if (value === null || value === undefined) return null
  const n = Number(formatUnits(BigInt(value), 18))
  return n > 0 && Number.isFinite(n) ? n : null
}

const quoteMintPreview = (d, price) => {
  const D = parseMintAmount(d)
  const M = D * USDX_MINT_K
  const usdtIn = D / 2
  const L0 = M
  const p = Number(price)
  const boxIn = p > 0 && Number.isFinite(p) ? usdtIn / p : 0
  return {
    usdtIn,
    boxIn,
    D,
    M,
    gain: M - D,
    L0,
    R: USDX_MINT_R_RATE * L0,
  }
}

/**
 * 与 HTML mintQuote 同口径的本地预览（D 为 18 位 wei）。
 * 空投入时 L0/M 为 0，R 为 0（UI「每日释放」显示「—」）。
 */
const getMintLocalPreview = (depositD) => {
  const D = BigInt(depositD ?? 0)
  if (D <= 0n) {
    return { M: 0n, L0: 0n, R: 0n }
  }
  const M = (D * 6n) / 5n
  const L0 = M
  const R = (L0 * 3n) / 1000n
  return { M, L0, R }
}

module.exports = {
  USDX_MINT_K,
  USDX_MINT_R_RATE,
  USDX_MIN_MINT_D,
  getMintGateCopy,
  getMintLocalPreview,
  parseMintAmount,
  wadToNumber,
  quoteMintPreview,
}
