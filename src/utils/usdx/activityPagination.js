const { ACTIVITY_KIND } = require('./activityViews')

const ACTIVITY_PAGE_SIZE = 50

const createActivityPagination = () => ({
  items: [],
  loadedRaw: 0n,
  total: 0n,
  hasMore: false,
})

const appendActivityPage = (state, page, totalValue) => {
  const rawPage = Array.isArray(page) ? page : []
  const total = BigInt(totalValue ?? 0)
  const loadedRaw = BigInt(state.loadedRaw) + BigInt(rawPage.length)

  return {
    items: [...state.items, ...rawPage],
    loadedRaw,
    total,
    hasMore: loadedRaw < total,
  }
}

const filterActivityItems = (items, tab) => {
  const list = Array.isArray(items) ? items : []
  if (!tab || tab === 'all') return list
  return list.filter((item) => ACTIVITY_KIND[Number(item.kind)]?.tab === tab)
}

const getActivityOffset = (state) => state.loadedRaw

const getActivityRequestKey = (chainId, diamond, address) => {
  if (chainId == null || !diamond || !address) return ''
  return `${chainId}:${diamond.toLowerCase()}:${address.toLowerCase()}`
}

const getActivityReadPrerequisiteError = ({
  address,
  chainId,
  diamond,
  hasPublicClient,
}) => {
  if (!address) return null
  if (chainId == null || !diamond) return new Error('USDX 活动合约配置缺失')
  if (!hasPublicClient) return new Error('USDX 活动 RPC 客户端不可用')
  return null
}

module.exports = {
  ACTIVITY_PAGE_SIZE,
  appendActivityPage,
  createActivityPagination,
  filterActivityItems,
  getActivityOffset,
  getActivityReadPrerequisiteError,
  getActivityRequestKey,
}
