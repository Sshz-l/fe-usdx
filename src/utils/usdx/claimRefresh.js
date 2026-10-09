const refreshUsdxAfterClaim = async ({ refetchPositions, refetchHome }) => {
  await Promise.allSettled([
    Promise.resolve().then(refetchPositions),
    Promise.resolve().then(refetchHome),
  ])
}

module.exports = { refreshUsdxAfterClaim }
