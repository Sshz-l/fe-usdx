const test = require('node:test')
const assert = require('node:assert/strict')

const {
  ACTIVITY_PAGE_SIZE,
  appendActivityPage,
  createActivityPagination,
  filterActivityItems,
  getActivityOffset,
  getActivityReadPrerequisiteError,
  getActivityRequestKey,
} = require('./activityPagination')

const activity = (kind, mintId) => ({
  kind,
  extra: 0,
  ts: 1692000000n + BigInt(mintId),
  mintId: BigInt(mintId),
  a0: 10n ** 18n,
  a1: 10n ** 18n,
  a2: 0n,
})

test('activity page size follows the contract hard limit', () => {
  assert.equal(ACTIVITY_PAGE_SIZE, 50)
})

test('filters after accumulating two raw pages', () => {
  const first = appendActivityPage(createActivityPagination(), [activity(0, 4), activity(2, 3)], 4n)
  const second = appendActivityPage(first, [activity(0, 2), activity(4, 1)], 4n)

  assert.deepEqual(
    filterActivityItems(second.items, 'mint').map((item) => item.mintId),
    [4n, 2n]
  )
  assert.equal(second.loadedRaw, 4n)
  assert.equal(second.hasMore, false)
})

test('an empty filtered first page does not end raw pagination', () => {
  const page = appendActivityPage(createActivityPagination(), [activity(4, 2), activity(3, 1)], 5n)

  assert.deepEqual(filterActivityItems(page.items, 'mint'), [])
  assert.equal(page.loadedRaw, 2n)
  assert.equal(page.hasMore, true)
  assert.equal(getActivityOffset(page), 2n)
})

test('pagination ends only when loaded raw count reaches total', () => {
  const partial = appendActivityPage(createActivityPagination(), [activity(0, 2)], 2n)
  const complete = appendActivityPage(partial, [activity(1, 1)], 2n)

  assert.equal(partial.hasMore, true)
  assert.equal(complete.loadedRaw, 2n)
  assert.equal(complete.total, 2n)
  assert.equal(complete.hasMore, false)
})

test('offset advances by raw rows and identical on-chain rows are all preserved', () => {
  const row = activity(4, 1)
  const first = appendActivityPage(createActivityPagination(), [row], 3n)
  const second = appendActivityPage(first, [row, activity(0, 2)], 3n)

  assert.equal(second.items.length, 3)
  assert.deepEqual(second.items, [row, row, activity(0, 2)])
  assert.equal(second.loadedRaw, 3n)
  assert.equal(getActivityOffset(second), 3n)
  assert.equal(second.hasMore, false)
})

test('large totals stay bigint and never truncate through Number', () => {
  const total = 9007199254740993n
  const page = appendActivityPage(createActivityPagination(), [activity(0, 1)], total)

  assert.equal(page.total, total)
  assert.equal(page.loadedRaw, 1n)
  assert.equal(getActivityOffset(page), 1n)
  assert.equal(page.hasMore, true)
})

test('request identity changes with wallet chain and address', () => {
  const diamond = '0x1111111111111111111111111111111111111111'
  const address = '0x2222222222222222222222222222222222222222'

  assert.notEqual(
    getActivityRequestKey(56, diamond, address),
    getActivityRequestKey(97, diamond, address)
  )
  assert.notEqual(
    getActivityRequestKey(97, diamond, address),
    getActivityRequestKey(97, diamond, '0x3333333333333333333333333333333333333333')
  )
  assert.equal(getActivityRequestKey(undefined, diamond, address), '')
})

test('read prerequisites allow disconnect but report connected configuration failures', () => {
  const address = '0x2222222222222222222222222222222222222222'
  const diamond = '0x1111111111111111111111111111111111111111'

  assert.equal(
    getActivityReadPrerequisiteError({
      address: undefined,
      chainId: undefined,
      diamond: undefined,
      hasPublicClient: false,
    }),
    null
  )
  assert.match(
    getActivityReadPrerequisiteError({
      address,
      chainId: 97,
      diamond: undefined,
      hasPublicClient: true,
    }).message,
    /合约配置/
  )
  assert.match(
    getActivityReadPrerequisiteError({
      address,
      chainId: 97,
      diamond,
      hasPublicClient: false,
    }).message,
    /RPC 客户端/
  )
})
