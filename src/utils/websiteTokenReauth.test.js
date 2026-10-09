const test = require('node:test')
const assert = require('node:assert/strict')

const {
  WEBSITE_TOKEN_REAUTH_TOPIC,
  WEBSITE_TOKEN_REAUTH_TIMEOUT_MS,
  shouldDeferWebsiteTokenExpiredLogout,
  beginWebsiteTokenReauth,
  completeWebsiteTokenReauth,
  isWebsiteTokenReauthInFlight,
  resetWebsiteTokenReauthForTests,
} = require('./websiteTokenReauth')

test('only DeBox WebView soft-handles website -2007', () => {
  assert.equal(
    shouldDeferWebsiteTokenExpiredLogout({ isDeBoxApp: true, code: -2007 }),
    true
  )
  assert.equal(
    shouldDeferWebsiteTokenExpiredLogout({ isDeBoxApp: false, code: -2007 }),
    false
  )
  assert.equal(
    shouldDeferWebsiteTokenExpiredLogout({ isDeBoxApp: true, code: -2018 }),
    false
  )
  assert.equal(
    shouldDeferWebsiteTokenExpiredLogout({ isDeBoxApp: true, code: -2023 }),
    false
  )
})

test('beginWebsiteTokenReauth publishes once and times out to logout', async () => {
  resetWebsiteTokenReauthForTests()
  const published = []
  let timedOut = 0
  const first = beginWebsiteTokenReauth({
    timeoutMs: 30,
    publish: (topic) => published.push(topic),
    onTimeout: () => {
      timedOut += 1
    },
  })
  const second = beginWebsiteTokenReauth({
    timeoutMs: 30,
    publish: (topic) => published.push(topic),
    onTimeout: () => {
      timedOut += 1
    },
  })
  assert.equal(first.started, true)
  assert.equal(second.started, false)
  assert.deepEqual(published, [WEBSITE_TOKEN_REAUTH_TOPIC])
  assert.equal(isWebsiteTokenReauthInFlight(), true)
  assert.equal(WEBSITE_TOKEN_REAUTH_TIMEOUT_MS, 15000)
  await new Promise((resolve) => setTimeout(resolve, 45))
  assert.equal(timedOut, 1)
  assert.equal(isWebsiteTokenReauthInFlight(), false)
})

test('completeWebsiteTokenReauth cancels pending logout timeout', async () => {
  resetWebsiteTokenReauthForTests()
  let timedOut = 0
  beginWebsiteTokenReauth({
    timeoutMs: 40,
    publish: () => {},
    onTimeout: () => {
      timedOut += 1
    },
  })
  completeWebsiteTokenReauth()
  assert.equal(isWebsiteTokenReauthInFlight(), false)
  await new Promise((resolve) => setTimeout(resolve, 55))
  assert.equal(timedOut, 0)
})

test('DeBox check_token failure should keep local profile for re-login', () => {
  const {
    shouldClearSessionBeforeWebsiteRelogin,
  } = require('./websiteTokenReauth')
  assert.equal(
    shouldClearSessionBeforeWebsiteRelogin({
      isDeBoxApp: true,
      checkTokenFailed: true,
      addressMismatch: false,
    }),
    false
  )
  assert.equal(
    shouldClearSessionBeforeWebsiteRelogin({
      isDeBoxApp: false,
      checkTokenFailed: true,
      addressMismatch: false,
    }),
    true
  )
  assert.equal(
    shouldClearSessionBeforeWebsiteRelogin({
      isDeBoxApp: true,
      checkTokenFailed: true,
      addressMismatch: true,
    }),
    true
  )
})

test('premium header prefers local account profile while website token refreshes', () => {
  const { resolvePremiumProfileDisplay } = require('./websiteTokenReauth')
  assert.deepEqual(
    resolvePremiumProfileDisplay({
      isLoggedIn: false,
      isDeBoxRestoring: true,
      basicInfo: null,
      account: { name: 'Sunny', pic: 'https://cdn/a.png' },
      defaultAvatar: '/default.png',
      notLoggedInLabel: 'Not Logged In',
    }),
    {
      showProfile: true,
      avatar: 'https://cdn/a.png',
      name: 'Sunny',
      restoring: false,
    }
  )
  assert.deepEqual(
    resolvePremiumProfileDisplay({
      isLoggedIn: false,
      isDeBoxRestoring: true,
      basicInfo: null,
      account: { address: '0xabc' },
      defaultAvatar: '/default.png',
      notLoggedInLabel: 'Not Logged In',
    }),
    {
      showProfile: true,
      avatar: '/default.png',
      name: '...',
      restoring: true,
    }
  )
  assert.deepEqual(
    resolvePremiumProfileDisplay({
      isLoggedIn: false,
      isDeBoxRestoring: false,
      basicInfo: null,
      account: null,
      defaultAvatar: '/default.png',
      notLoggedInLabel: 'Not Logged In',
    }),
    {
      showProfile: false,
      avatar: '/default.png',
      name: 'Not Logged In',
      restoring: false,
    }
  )
})
