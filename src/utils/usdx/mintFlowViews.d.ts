export type TMintFlowFlag = 'todo' | 'prep' | 'wait' | 'skip' | 'done' | 'fail'
export type TMintFlowPhase = 'idle' | 'checking' | 'run' | 'retry' | 'finish'
export type TMintFlowStep = {
  id: string
  kind: 'tx' | 'sig'
  label: string
}
export type TMintFlowRow = {
  id: string
  kind: 'tx' | 'sig'
  label: string
  flag: TMintFlowFlag
  status: string
}
export type TMintFlowCta = {
  text: string
  loading: boolean
  disabled: boolean
}

export const MIN_LP_LIQUIDITY_NOT_MET_SELECTOR: `0x${string}`
export const MINT_FLOW_STEPS: TMintFlowStep[]
export const MINT_FLOW_SKIP_MS: number
export const MINT_FLOW_NEXT_MS: number
export const MINT_FLOW_PREP_TIMEOUT_MS: number
export const MINT_FLOW_WRITE_TIMEOUT_MS: number
export const MINT_LP_TOLERANCE_BPS: bigint
export const MINT_FLOW_TIMEOUT_MESSAGE: string
export function isMintFlowTimeoutError(error: unknown): boolean
export function withMintFlowTimeout<T>(promise: Promise<T>, ms: number): Promise<T>
export function canSkipMintFlowStep(
  step: TMintFlowStep,
  approved?: Record<string, boolean>
): boolean
export function createMintFlowFlags(): TMintFlowFlag[]
export function patchMintFlowFlag(
  flags: TMintFlowFlag[] | null | undefined,
  index: number,
  flag: TMintFlowFlag
): TMintFlowFlag[]
export function getMintFlowCta(args?: {
  phase?: TMintFlowPhase
  stepId?: string
}): TMintFlowCta
export type TMintFailKind = 'wallet' | 'slippage' | 'chain'
export function getMintFlowRows(
  flags?: TMintFlowFlag[],
  opts?: { failKind?: TMintFailKind | null }
): TMintFlowRow[]
export function getMintFlowStepStatus(
  step: TMintFlowStep,
  flag: TMintFlowFlag,
  opts?: { failKind?: TMintFailKind | null; previousReady?: boolean }
): string
export function shouldAutoFinishMint(phase?: TMintFlowPhase | string): boolean
export function isMintSlippageError(error: unknown): boolean
export function getMintRetryFromIndex(failedIndex: number, error: unknown): number
export function resolveMinLpLiquidity(value: unknown): bigint | null
export function applyMintQuoteRefresh(quote: unknown):
  | { ok: false }
  | { ok: true; boxIn: bigint; maxBoxIn: bigint }
