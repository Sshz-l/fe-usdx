import { InjectedConnector } from './InjectedConnector'

export class UniSatWalletConnector extends InjectedConnector {
  #provider?: any

  readonly id: string
  readonly name: string
  readonly ready = typeof window != 'undefined' && !!(window as any).unisat

  constructor () {
    super()

    this.id = 'unisatWallet'
    this.name = 'unisatWallet'
  }

  async getProvider () {
    if (typeof window !== 'undefined' && !!(window as any).unisat)
      this.#provider = (window as any).unisat
    return this.#provider
  }
}
