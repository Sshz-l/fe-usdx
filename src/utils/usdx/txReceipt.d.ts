export declare const USDX_TX_REVERTED_MESSAGE: string

export declare const isUsdxTxSuccess: (receipt: { status?: string } | null | undefined) => boolean

export declare const assertUsdxTxSuccess: <T extends { status?: string }>(
  receipt: T | null | undefined,
  message?: string
) => T

export declare const waitForUsdxTxSuccess: <T extends { status?: string }>(
  publicClient: {
    waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<T>
  },
  hash: `0x${string}`,
  message?: string
) => Promise<T>
