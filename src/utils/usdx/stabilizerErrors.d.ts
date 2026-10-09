export type TUsdxQueueOrderMismatchError = {
  code: 'queue-order-mismatch'
  queueAmount: bigint
  requestedAmount: bigint
}

export function decodeUsdxStabilizerErrorData(
  data: unknown
): TUsdxQueueOrderMismatchError | null

export function getUsdxErrorShortMessage(error: unknown): string | null

export function getUsdxStabilizerErrorMessage(error: unknown): string | null

export function getUsdxWriteErrorMessage(error: unknown, fallback: string): string
