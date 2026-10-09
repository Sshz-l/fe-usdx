/**
 * 以注入钱包 eth_chainId 为准切到 USDX 目标链，并用同一 walletClient 校验。
 * 勿只信 useAccount().chainId：与签名用的 active chain 可能不一致。
 * 勿在切链后仍用 useSignTypedData（可能仍走旧链）；应使用同一 walletClient.signTypedData。
 * 切链后务必 getWalletClient({ chainId }) 拿新 signer，避免 React 闭包里的旧 client.chain.id。
 */

const toHexChainId = (chainId) => `0x${Number(chainId).toString(16)}`

const readProviderChainId = async (walletClient) => {
  if (typeof walletClient.request === 'function') {
    const hex = await walletClient.request({ method: 'eth_chainId' })
    const n = Number(hex)
    if (Number.isFinite(n)) return n
  }
  if (typeof walletClient.getChainId === 'function') {
    return walletClient.getChainId()
  }
  throw new Error('walletClient cannot read chain id')
}

const BSC_ADD_CHAIN_PARAMS = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com'],
}

const switchViaWalletRequest = async (walletClient, targetChainId) => {
  const chainIdHex = toHexChainId(targetChainId)
  try {
    await walletClient.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
    return
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code ?? error.data?.originalError?.code : null
    /* 4902: unrecognized chain — try add then switch (BSC only) */
    if (Number(code) === 4902 && targetChainId === 56 && typeof walletClient.request === 'function') {
      await walletClient.request({
        method: 'wallet_addEthereumChain',
        params: [BSC_ADD_CHAIN_PARAMS],
      })
      await walletClient.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
      return
    }
    throw error
  }
}

/**
 * @param {{
 *   targetChainId: number | undefined
 *   walletClient: any
 *   switchChainAsync?: ((args: { chainId: number }) => Promise<unknown>) | undefined
 *   missingMessage: string
 *   switchMessage: string
 *   forceSwitch?: boolean
 * }} args
 */
const ensureUsdxWalletChain = async ({
  targetChainId,
  walletClient,
  switchChainAsync,
  missingMessage,
  switchMessage,
  forceSwitch = false,
}) => {
  if (targetChainId == null) throw new Error(missingMessage)
  if (!walletClient) throw new Error(missingMessage)

  let current = await readProviderChainId(walletClient)
  if (current === targetChainId && !forceSwitch) return

  let lastError = null

  /* 1) 优先走同一 walletClient 的 provider 切链（与后续 signTypedData 同源） */
  if (typeof walletClient.request === 'function') {
    try {
      await switchViaWalletRequest(walletClient, targetChainId)
      current = await readProviderChainId(walletClient)
      if (current === targetChainId) return
    } catch (error) {
      lastError = error
    }
  }

  /* 2) viem walletClient.switchChain */
  if (typeof walletClient.switchChain === 'function') {
    try {
      await walletClient.switchChain({ id: targetChainId })
      current = await readProviderChainId(walletClient)
      if (current === targetChainId) return
    } catch (error) {
      lastError = error
    }
  }

  /* 3) wagmi useSwitchChain 兜底 */
  if (typeof switchChainAsync === 'function') {
    try {
      await switchChainAsync({ chainId: targetChainId })
      current = await readProviderChainId(walletClient)
      if (current === targetChainId) return
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error && lastError.message) {
    throw lastError
  }
  throw new Error(switchMessage)
}

/**
 * 切链后重新拉取绑定目标 chainId 的 walletClient，避免闭包里仍是旧链 signer。
 * @param {{
 *   config: any
 *   targetChainId: number
 *   getWalletClient: (...args: any[]) => Promise<any>
 *   switchMessage: string
 * }} args
 */
const resolveUsdxWalletClient = async ({
  config,
  targetChainId,
  getWalletClient,
  switchMessage,
}) => {
  if (targetChainId == null || typeof getWalletClient !== 'function') {
    throw new Error(switchMessage)
  }
  const client = await getWalletClient(config, { chainId: targetChainId })
  if (!client) throw new Error(switchMessage)

  const providerChainId = await readProviderChainId(client)
  if (providerChainId !== targetChainId) {
    throw new Error(switchMessage)
  }
  if (client.chain?.id != null && Number(client.chain.id) !== Number(targetChainId)) {
    throw new Error(switchMessage)
  }
  return client
}

module.exports = {
  ensureUsdxWalletChain,
  resolveUsdxWalletClient,
  readProviderChainId,
  toHexChainId,
}
