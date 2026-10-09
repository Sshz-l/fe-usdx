const test = require('node:test')
const assert = require('node:assert/strict')

const { refreshUsdxAfterClaim } = require('./claimRefresh')

test('领取成功后同时刷新仓位与首页，并等待两侧完成', async () => {
  const events = []
  let finishPositions
  let finishHome

  const positionsDone = new Promise((resolve) => {
    finishPositions = resolve
  })
  const homeDone = new Promise((resolve) => {
    finishHome = resolve
  })

  const refreshing = refreshUsdxAfterClaim({
    refetchPositions: async () => {
      events.push('positions:start')
      await positionsDone
      events.push('positions:end')
    },
    refetchHome: async () => {
      events.push('home:start')
      await homeDone
      events.push('home:end')
    },
  })

  await Promise.resolve()
  assert.deepEqual(events, ['positions:start', 'home:start'])

  finishPositions()
  await Promise.resolve()
  assert.deepEqual(events, ['positions:start', 'home:start', 'positions:end'])

  finishHome()
  await refreshing
  assert.deepEqual(events, ['positions:start', 'home:start', 'positions:end', 'home:end'])
})

test('一侧同步抛错时仍启动并等待另一侧，且不把刷新失败当成领取失败', async () => {
  const events = []

  await assert.doesNotReject(() =>
    refreshUsdxAfterClaim({
      refetchPositions: () => {
        events.push('positions')
        throw new Error('positions failed')
      },
      refetchHome: async () => {
        events.push('home:start')
        await Promise.resolve()
        events.push('home:end')
      },
    })
  )

  assert.deepEqual(events, ['positions', 'home:start', 'home:end'])
})

test('一侧异步拒绝时仍等待另一侧，且 helper 正常完成', async () => {
  const events = []

  await assert.doesNotReject(() =>
    refreshUsdxAfterClaim({
      refetchPositions: async () => {
        events.push('positions')
        throw new Error('positions rejected')
      },
      refetchHome: async () => {
        events.push('home:start')
        await Promise.resolve()
        events.push('home:end')
      },
    })
  )

  assert.deepEqual(events, ['positions', 'home:start', 'home:end'])
})
