import { default as EventEmitter } from 'eventemitter3'

export interface ConnectorEvents {
  change(data: { account: string }): void
  disconnect(): void
}

export class InjectedConnector extends EventEmitter<ConnectorEvents> {
  readonly id: string = ''
  readonly name: string = ''
  // readonly ready: boolean

  #provider: any = null

  protected onAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) this.emit('disconnect')
    else
      this.emit('change', {
        account: accounts[0],
      })
  }
  protected onDisconnect = async () => {
    this.emit('disconnect')
  }

  async getProvider () {
    if (typeof window !== 'undefined' && !!(window as any).bitcoin)
      this.#provider = (window as any).bitcoin
    return this.#provider
  }

  async connect (): Promise<[string]> {
    const provider = await this.getProvider()
    provider?.on('accountsChanged', this.onAccountsChanged.bind(this))

    const accounts = await provider?.requestAccounts()
    if (accounts?.length > 0) {
      this.onAccountsChanged(accounts)
    }
    return accounts
  }

  async disconnect () {
    const provider = await this.getProvider()
    provider?.off('accountsChanged', this.onAccountsChanged.bind(this))
    this.#provider = null
  }

  async getAccount (): Promise<[string]> {
    return await (await this.getProvider())?.getAccounts()
  }

  async getNetwork (): Promise<'livenet' | 'testnet'> {
    return await (await this.getProvider())?.getNetwork()
  }

  async signMessage (message: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string> {
    return await (await this.getProvider())?.signMessage(message, type)
  }

  async getPublicKey (): Promise<[string]> {
    return await (await this.getProvider())?.getPublicKey()
  }
}
