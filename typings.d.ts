type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T]

declare interface Window {
  deboxConfig: any
  ethereum: any
  okxwallet: any
  gtag: any
  bitkeep: any
  OSS: any
}

declare module 'qrcode'
