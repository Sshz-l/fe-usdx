export type TUsdxWalletId = 'debox' | 'metamask' | 'walletconnect' | 'okx'

export type TWalletConnector = {
  id: string
  name?: string
  type?: string
}

export type TUsdxWalletOption<TConnector extends TWalletConnector = TWalletConnector> = {
  id: TUsdxWalletId
  name: string
  description: string
  icon: 'box' | 'hexagon' | 'scan-line' | 'circle-dot'
  connector: TConnector | null
  available: boolean
}

export const WALLET_DEFINITIONS: readonly Omit<TUsdxWalletOption, 'connector' | 'available'>[]

export function getNextDeBoxProviderProbeDelay(attempt: number, discovered: boolean): number | null

export function resolveUsdxWalletOptions<TConnector extends TWalletConnector>(
  connectors: readonly TConnector[],
  environment?: { verifiedDeBoxConnectors?: readonly TConnector[] }
): TUsdxWalletOption<TConnector>[]

export function getUsdxWalletName(connector?: TWalletConnector | null): string

export function isVerifiedDeBoxProvider(
  provider: unknown,
  knownDeBoxProviders?: readonly unknown[]
): boolean

export type TUsdxWalletState = 'off' | 'wrong' | 'on'
export type TUsdxMineWalletGate =
  | {
      visible: true
      label: string
      description: string
      action: 'open-wallet' | 'switch-chain'
    }
  | { visible: false; action: null }

export function getUsdxMineWalletGate(walletState: TUsdxWalletState): TUsdxMineWalletGate
