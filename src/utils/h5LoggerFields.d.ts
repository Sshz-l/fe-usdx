export declare const MAX_KEYS: number

export declare function sanitizeRequestId(value: unknown): string | undefined

export declare function extractApiPath(url: unknown): string

/** FNV-1a 32-bit → 8 hex chars; empty input → undefined */
export declare function hash8(value: unknown): string | undefined

export declare function inferErrReason(message: string): string | null

export declare function formatErr(error: unknown, fallbackReason?: string): string

type KeyValue = string | number | boolean | undefined | null

export declare function buildKeys(pairs: Record<string, KeyValue>): string[]
