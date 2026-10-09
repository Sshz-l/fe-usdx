export type TDisconnectUsdxWalletOptions<TConnector> = {
  connectors: readonly TConnector[]
  currentConnector?: TConnector
  disconnectConnector: (connector: TConnector) => Promise<unknown>
  markManualLogout: () => void
  resetConnectionState: () => void
  clearPersistedState: () => Promise<unknown>
  setDisconnecting: (disconnecting: boolean) => void
}

export declare const disconnectUsdxWallet: <TConnector>(
  options: TDisconnectUsdxWalletOptions<TConnector>
) => Promise<void>

export type TConnectUsdxWalletExplicitlyOptions<TResult> = {
  connect: () => Promise<TResult>
  clearManualLogout: () => void
  markManualLogout: () => void
}

export declare const connectUsdxWalletExplicitly: <TResult>(
  options: TConnectUsdxWalletExplicitlyOptions<TResult>
) => Promise<TResult>
