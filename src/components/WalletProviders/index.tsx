import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { TronWalletProvider } from '@fe-common/sdk/src/tronConnectors/index'
import { SolanaProvider } from '@fe-common/sdk/src/SolConnectors/index'
import { BTCStoreProvider } from '@fe-common/sdk/src/btcConnectors/index'
import { WagmiProvider } from 'wagmi'

import { getUserAuthHeaders } from '@/utils/auth'
import { wagmiConfig } from '@/connectors'
import { shouldWagmiReconnectOnMount } from '@/utils/wagmiConnector'
import { WagmiBrokenConnectorGuard } from '@/components/WalletProviders/WagmiBrokenConnectorGuard'

interface WalletProvidersProps {
  children: ReactNode
  needWallet: boolean
  client?: QueryClient
}

const isServer = typeof window === 'undefined'

export const WalletProviders = ({ children, client, needWallet }: WalletProvidersProps) => {
  const headers = isServer ? {} : getUserAuthHeaders()
  const [reconnectOnMount] = useState(() =>
    isServer ? true : shouldWagmiReconnectOnMount()
  )

  let content = (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={reconnectOnMount}>
      <WagmiBrokenConnectorGuard />
      {children}
    </WagmiProvider>
  )

  if (needWallet) {
    content = (
      <TronWalletProvider>
        <SolanaProvider headers={headers}>
          <BTCStoreProvider>
            {content}
          </BTCStoreProvider>
        </SolanaProvider>
      </TronWalletProvider>
    )
  }

  if (client) {
    content = (
      <QueryClientProvider client={client}>
        {content}
      </QueryClientProvider>
    )
  }

  return content
}
