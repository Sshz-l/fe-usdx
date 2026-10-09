import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks'
import { useMemo } from 'react'
// import { BitKeepAdapter } from '@tronweb3/tronwallet-adapter-bitkeep'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'

export const TronWalletProvider = ({ children }: any) => {
  const tronAdapters = useMemo(() => {
    if (typeof window === 'undefined') {
      return []
    }

    return [
      new OkxWalletAdapter(),
      //  new BitKeepAdapter(), // TODO: 编译有问题，暂不支持
      new TokenPocketAdapter(),
    ]
  }, [])

  return (
    <WalletProvider autoConnect={false} adapters={tronAdapters}>
      {children}
    </WalletProvider>
  )
}
