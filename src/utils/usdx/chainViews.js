const { parseDepositD } = require('./amounts')
const { asMintQuoteView } = require('./homeViews')

/** 用户输入 D（USDT 计价总投入）→ usdtIn wei */
const dToUsdtIn = (d) => {
  const parsed = parseDepositD(d)
  return parsed.ok ? parsed.usdtIn : 0n
}

/** 防抖后的 quote 是否与当前输入一致（按 usdtIn wei 比较） */
const isMintQuoteAmountSynced = (usdtInWei, quoteUsdtInWei) =>
  typeof usdtInWei === 'bigint' &&
  typeof quoteUsdtInWei === 'bigint' &&
  usdtInWei > 0n &&
  usdtInWei === quoteUsdtInWei

const getMintQuoteDisplay = (quote) => {
  const q = asMintQuoteView(quote)
  if (!q) {
    return {
      mintable: false,
      boxIn: null,
      depositD: null,
      immediate: null,
      lockL0: null,
      daily: null,
      M: null,
    }
  }
  const depositD = q.depositD
  const M = q.immediate + q.lockL0
  return {
    mintable: Boolean(q.mintable),
    boxIn: q.boxIn,
    depositD,
    immediate: q.immediate,
    lockL0: q.lockL0,
    daily: q.daily,
    M,
    gain: M > depositD ? M - depositD : 0n,
    R: q.daily,
  }
}

module.exports = {
  dToUsdtIn,
  getMintQuoteDisplay,
  isMintQuoteAmountSynced,
}
