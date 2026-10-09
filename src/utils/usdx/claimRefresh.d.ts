type TClaimRefreshOptions = {
  refetchPositions: () => unknown | Promise<unknown>
  refetchHome: () => unknown | Promise<unknown>
}

export declare const refreshUsdxAfterClaim: (
  options: TClaimRefreshOptions
) => Promise<void>
