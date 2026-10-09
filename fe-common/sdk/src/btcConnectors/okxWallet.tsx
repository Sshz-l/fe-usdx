import { InjectedConnector } from './InjectedConnector'

export class ObxWalletConnector extends InjectedConnector {
  #provider?: Window['okxwallet']['bitcoin']

  readonly id: string
  readonly name: string
  readonly ready = typeof window != 'undefined' && !!window.okxwallet?.bitcoin

  constructor () {
    super()

    this.id = 'okxWalletBtc'
    this.name = 'okxWallet'
  }

  async getProvider () {
    if (typeof window !== 'undefined' && !!window.okxwallet?.bitcoin)
      this.#provider = window.okxwallet?.bitcoin
    return this.#provider
  }
}
