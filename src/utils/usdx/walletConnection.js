const disconnectUsdxWallet = async ({
  connectors,
  currentConnector,
  disconnectConnector,
  markManualLogout,
  resetConnectionState,
  clearPersistedState,
  setDisconnecting,
}) => {
  setDisconnecting(true)

  try {
    markManualLogout()
    resetConnectionState()

    const targets = new Set(connectors)
    if (currentConnector) targets.add(currentConnector)

    for (const connector of targets) {
      try {
        await disconnectConnector(connector)
      } catch {
        // Best effort: one unavailable provider must not keep another connection alive.
      }
    }
  } finally {
    try {
      resetConnectionState()
    } finally {
      try {
        await clearPersistedState()
      } finally {
        setDisconnecting(false)
      }
    }
  }
}

const connectUsdxWalletExplicitly = async ({
  connect,
  clearManualLogout,
  markManualLogout,
}) => {
  try {
    const result = await connect()
    clearManualLogout()
    return result
  } catch (error) {
    markManualLogout()
    throw error
  }
}

module.exports = {
  connectUsdxWalletExplicitly,
  disconnectUsdxWallet,
}
