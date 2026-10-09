import { useCallback, useRef, useState } from 'react'
import { getWalletClient } from '@wagmi/core'
import {
  useAccount,
  useConfig,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from 'wagmi'
import { t } from '@lingui/macro'

import { usdxDiamondAbi } from '@/abis/usdx/diamondAbi'
import {
  ensureErc20Permit2Allowance,
  hasErc20Permit2Allowance,
} from '@/utils/usdx/erc20Permit2'
import { ensureUsdxWalletChain, resolveUsdxWalletClient } from '@/utils/usdx/ensureUsdxChain'
import { dToUsdtIn, getMintQuoteDisplay } from '@/utils/usdx/chainViews'
import { isUserRejectedWalletError, isWalletRequestTimeoutError } from '@/utils/walletErrors'
import {
  MINT_FLOW_NEXT_MS,
  MINT_FLOW_PREP_TIMEOUT_MS,
  MINT_FLOW_SKIP_MS,
  MINT_FLOW_STEPS,
  MINT_FLOW_WRITE_TIMEOUT_MS,
  applyMintQuoteRefresh,
  canSkipMintFlowStep,
  createMintFlowFlags,
  getMintRetryFromIndex,
  isMintFlowTimeoutError,
  isMintSlippageError,
  patchMintFlowFlag,
  resolveMinLpLiquidity,
  withMintFlowTimeout,
  type TMintFailKind,
} from '@/utils/usdx/mintFlowViews'
import { getUsdxWriteErrorMessage } from '@/utils/usdx/stabilizerErrors'
import { waitForUsdxTxSuccess } from '@/utils/usdx/txReceipt'
import {
  buildPermitBatchTransferMessage,
  buildPermit2Domain,
  PERMIT2_BATCH_TYPES,
  permit2Deadline,
  randomPermit2Nonce,
  toContractPermit,
  type TPermitBatchTransferFrom,
  type TPermitBatchTransferMessage,
} from '@/utils/usdx/permit2Constants'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'

type TMintQuote = ReturnType<typeof getMintQuoteDisplay>
type TMintFlowFlag = 'todo' | 'prep' | 'wait' | 'skip' | 'done' | 'fail'
type TMintFlowPhase = 'idle' | 'checking' | 'run' | 'retry' | 'finish'
type TMintFlowResult = 'finish' | 'retry'

type TMintFlowCtx = {
  dRaw: string
  quote: TMintQuote
  usdtIn: bigint
  maxBoxIn: bigint
  minLpLiquidity: bigint | null
  permitBatch: TPermitBatchTransferMessage | null
  signature: `0x${string}` | null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useUsdxMintAction = () => {
  const usdx = useUsdxConfig()
  const wagmiConfig = useConfig()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: usdx?.chainId })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const [failKind, setFailKind] = useState<TMintFailKind | null>(null)
  const [phase, setPhase] = useState<TMintFlowPhase>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [flags, setFlags] = useState<TMintFlowFlag[]>(() => createMintFlowFlags())

  const targetChainId = usdx?.chainId
  const diamond = usdx?.diamond as `0x${string}` | undefined
  const permit2 = usdx?.permit2 as `0x${string}` | undefined
  const usdt = usdx?.usdt as `0x${string}` | undefined
  const box = usdx?.box as `0x${string}` | undefined

  const generationRef = useRef(0)
  const stepIndexRef = useRef(0)
  const ctxRef = useRef<TMintFlowCtx | null>(null)

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: targetChainId,
  })

  const buildMintPermitBatch = useCallback(
    (usdtIn: bigint, maxBoxIn: bigint): TPermitBatchTransferFrom => {
      if (!usdt || !box) throw new Error(t`USDX config missing`)
      return {
        permitted: [
          { token: usdt, amount: usdtIn },
          { token: box, amount: maxBoxIn },
        ],
        nonce: randomPermit2Nonce(),
        deadline: permit2Deadline(),
      }
    },
    [box, usdt]
  )

  const prepareUsdxWallet = useCallback(async () => {
    if (!isConnected || !address) throw new Error(t`Please connect your wallet`)
    if (!diamond || !permit2 || !usdt || !box || !publicClient || !walletClient) {
      throw new Error(t`USDX config or client unavailable`)
    }
    if (targetChainId == null) throw new Error(t`USDX config or client unavailable`)

    await ensureUsdxWalletChain({
      targetChainId,
      walletClient,
      switchChainAsync,
      missingMessage: t`USDX config or client unavailable`,
      switchMessage: t`Please switch to BNB Smart Chain`,
    })

    const signer = (await resolveUsdxWalletClient({
      config: wagmiConfig,
      targetChainId,
      getWalletClient,
      switchMessage: t`Please switch to BNB Smart Chain`,
    })) as NonNullable<typeof walletClient>

    return {
      address: address as `0x${string}`,
      diamond,
      permit2,
      usdt,
      box,
      publicClient,
      walletClient: signer,
    }
  }, [
    address,
    box,
    diamond,
    isConnected,
    permit2,
    publicClient,
    switchChainAsync,
    targetChainId,
    usdt,
    wagmiConfig,
    walletClient,
  ])

  const signMintPermitBatch = useCallback(
    async (
      permitBatch: TPermitBatchTransferMessage,
      client: NonNullable<typeof walletClient>,
      account: `0x${string}`
    ) => {
      if (!targetChainId || !permit2) throw new Error(t`Wallet or config unavailable`)
      return client.signTypedData({
        account,
        domain: buildPermit2Domain(targetChainId, permit2),
        types: PERMIT2_BATCH_TYPES,
        primaryType: 'PermitBatchTransferFrom',
        message: permitBatch,
      })
    },
    [permit2, targetChainId]
  )

  const runFrom = useCallback(
    async (fromIdx: number): Promise<TMintFlowResult> => {
      const gen = generationRef.current
      let ready: Awaited<ReturnType<typeof prepareUsdxWallet>>
      let ctx: TMintFlowCtx
      try {
        ready = await prepareUsdxWallet()
        const nextCtx = ctxRef.current
        if (!nextCtx) throw new Error(t`Minting unavailable, please refresh the quote`)
        ctx = nextCtx
      } catch (e) {
        if (generationRef.current !== gen) return 'retry'
        setFlags((prev) => patchMintFlowFlag(prev, fromIdx, 'fail'))
        stepIndexRef.current = fromIdx
        setStepIndex(fromIdx)
        setPhase('retry')
        if (isUserRejectedWalletError(e)) {
          setFailKind('wallet')
        } else {
          setFailKind('chain')
          setError(getUsdxWriteErrorMessage(e, t`Mint failed, please try again`))
        }
        return 'retry'
      }

      for (let i = fromIdx; i < MINT_FLOW_STEPS.length; i++) {
        if (generationRef.current !== gen) return 'retry'
        const step = MINT_FLOW_STEPS[i]
        stepIndexRef.current = i
        setStepIndex(i)

        try {
          if (step.id === 'apprU' || step.id === 'apprB') {
            const token = step.id === 'apprU' ? ready.usdt : ready.box
            const approved = await hasErc20Permit2Allowance({
              publicClient: ready.publicClient,
              token,
              owner: ready.address,
              permit2: ready.permit2,
            })
            if (generationRef.current !== gen) return 'retry'
            if (canSkipMintFlowStep(step, { [step.id]: approved })) {
              setFlags((prev) => patchMintFlowFlag(prev, i, 'skip'))
              await sleep(MINT_FLOW_SKIP_MS)
              continue
            }
          }

          setPhase('run')
          setFlags((prev) => patchMintFlowFlag(prev, i, 'prep'))
          /* 签名 / 发交易前重新切链并换绑 BSC walletClient */
          if (step.id === 'p2' || step.id === 'mint' || step.id === 'apprU' || step.id === 'apprB') {
            const refreshed = await prepareUsdxWallet()
            ready.walletClient = refreshed.walletClient
          }
          if (step.id === 'apprU') {
            setFlags((prev) => patchMintFlowFlag(prev, i, 'wait'))
            await ensureErc20Permit2Allowance({
              publicClient: ready.publicClient,
              walletClient: ready.walletClient,
              token: ready.usdt,
              owner: ready.address,
              permit2: ready.permit2,
            })
          } else if (step.id === 'apprB') {
            setFlags((prev) => patchMintFlowFlag(prev, i, 'wait'))
            await ensureErc20Permit2Allowance({
              publicClient: ready.publicClient,
              walletClient: ready.walletClient,
              token: ready.box,
              owner: ready.address,
              permit2: ready.permit2,
            })
          } else if (step.id === 'p2') {
            /* maxBoxIn 与 minLpLiquidity 必须来自同一池子状态：multicall 单次 eth_call 同块执行 */
            const [latestQuote, latestMinLp] = await withMintFlowTimeout(
              ready.publicClient.multicall({
                allowFailure: false,
                contracts: [
                  {
                    address: ready.diamond,
                    abi: usdxDiamondAbi,
                    functionName: 'quoteMint',
                    args: [ctx.usdtIn],
                  },
                  {
                    address: ready.diamond,
                    abi: usdxDiamondAbi,
                    functionName: 'quoteMinLpLiquidity',
                    args: [ctx.usdtIn],
                  },
                ],
              }),
              MINT_FLOW_PREP_TIMEOUT_MS
            )
            const refreshed = applyMintQuoteRefresh(latestQuote)
            const minLpLiquidity = resolveMinLpLiquidity(latestMinLp)
            if (!refreshed.ok || minLpLiquidity == null) {
              throw new Error(t`Minting unavailable, please refresh the quote`)
            }
            ctx.maxBoxIn = refreshed.maxBoxIn
            ctx.minLpLiquidity = minLpLiquidity
            ctx.permitBatch = null
            ctx.signature = null
            const permitBatch = buildPermitBatchTransferMessage(
              buildMintPermitBatch(ctx.usdtIn, ctx.maxBoxIn),
              ready.diamond
            )
            setFlags((prev) => patchMintFlowFlag(prev, i, 'wait'))
            const signature = await signMintPermitBatch(
              permitBatch,
              ready.walletClient,
              ready.address
            )
            ctx.permitBatch = permitBatch
            ctx.signature = signature
          } else {
            if (!ctx.permitBatch || !ctx.signature) {
              throw new Error(t`Invalid signature, please retry the swap`)
            }
            if (ctx.minLpLiquidity == null) {
              throw new Error(t`Minting unavailable, please refresh the quote`)
            }
            const mintArgs = [
              ctx.usdtIn,
              ctx.maxBoxIn,
              ctx.minLpLiquidity,
              toContractPermit(ctx.permitBatch),
              ctx.signature,
            ] as const
            await withMintFlowTimeout(
              ready.publicClient.simulateContract({
                address: ready.diamond,
                abi: usdxDiamondAbi,
                functionName: 'mintWithMinLpLiquidity',
                args: mintArgs,
                account: ready.address,
              }),
              MINT_FLOW_PREP_TIMEOUT_MS
            )
            if (generationRef.current !== gen) return 'retry'
            setFlags((prev) => patchMintFlowFlag(prev, i, 'wait'))
            const hash = await withMintFlowTimeout(
              writeContractAsync({
                address: ready.diamond,
                abi: usdxDiamondAbi,
                functionName: 'mintWithMinLpLiquidity',
                args: mintArgs,
                chainId: targetChainId,
              }),
              MINT_FLOW_WRITE_TIMEOUT_MS
            )
            await waitForUsdxTxSuccess(ready.publicClient, hash)
          }
        } catch (e) {
          if (generationRef.current !== gen) return 'retry'
          const retryFrom = getMintRetryFromIndex(i, e)
          setFlags((prev) => {
            const next = patchMintFlowFlag(prev, i, 'fail')
            if (retryFrom >= i) return next
            return next.map((flag, idx) => (idx >= retryFrom && idx < i ? 'todo' : flag))
          })
          stepIndexRef.current = retryFrom
          setStepIndex(retryFrom)
          setPhase('retry')
          if (isUserRejectedWalletError(e)) {
            setFailKind('wallet')
          } else if (isMintSlippageError(e)) {
            setFailKind('slippage')
            setError(getUsdxWriteErrorMessage(e, t`Mint failed, please try again`))
          } else if (isMintFlowTimeoutError(e) || isWalletRequestTimeoutError(e)) {
            resetWrite()
            setFailKind('chain')
            setError(t`Request timed out, please retry`)
          } else {
            setFailKind('chain')
            setError(getUsdxWriteErrorMessage(e, t`Mint failed, please try again`))
          }
          return 'retry'
        }

        if (generationRef.current !== gen) return 'retry'
        setFlags((prev) => patchMintFlowFlag(prev, i, 'done'))
        await sleep(MINT_FLOW_NEXT_MS)
        if (generationRef.current !== gen) return 'retry'
      }

      if (generationRef.current !== gen) return 'retry'
      setPhase('finish')
      return 'finish'
    },
    [
      buildMintPermitBatch,
      prepareUsdxWallet,
      resetWrite,
      signMintPermitBatch,
      targetChainId,
      writeContractAsync,
    ]
  )

  const start = useCallback(
    async (dRaw: string, quote: TMintQuote): Promise<TMintFlowResult> => {
      setError(null)
      setFailKind(null)
      resetWrite()
      if (!quote.mintable || quote.boxIn == null) {
        throw new Error(t`Minting unavailable, please refresh the quote`)
      }
      const usdtIn = dToUsdtIn(dRaw)
      if (usdtIn <= 0n) throw new Error(t`Enter a valid amount`)
      const refreshed = applyMintQuoteRefresh({ boxIn: quote.boxIn, mintable: quote.mintable })
      if (!refreshed.ok) throw new Error(t`Minting unavailable, please refresh the quote`)

      generationRef.current += 1
      ctxRef.current = {
        dRaw,
        quote,
        usdtIn,
        maxBoxIn: refreshed.maxBoxIn,
        minLpLiquidity: null,
        permitBatch: null,
        signature: null,
      }
      setFlags(createMintFlowFlags())
      setStepIndex(0)
      stepIndexRef.current = 0
      setPhase('checking')
      return runFrom(0)
    },
    [resetWrite, runFrom]
  )

  const retry = useCallback(async (): Promise<TMintFlowResult> => {
    if (!ctxRef.current) throw new Error(t`Minting unavailable, please refresh the quote`)
    setError(null)
    setFailKind(null)
    generationRef.current += 1
    const from = stepIndexRef.current
    setFlags((prev) => prev.map((flag, idx) => (idx >= from ? 'todo' : flag)))
    setPhase('run')
    return runFrom(from)
  }, [runFrom])

  const reset = useCallback(() => {
    generationRef.current += 1
    ctxRef.current = null
    setPhase('idle')
    setStepIndex(0)
    stepIndexRef.current = 0
    setFlags(createMintFlowFlags())
    setError(null)
    setFailKind(null)
    resetWrite()
  }, [resetWrite])

  const busy = phase === 'checking' || phase === 'run'
  const stepId = MINT_FLOW_STEPS[stepIndex]?.id

  return {
    start,
    retry,
    reset,
    phase,
    stepIndex,
    stepId,
    flags,
    failKind,
    busy,
    submitting: busy || confirming,
    txHash,
    isSuccess,
    error,
    resetWrite,
  }
}
