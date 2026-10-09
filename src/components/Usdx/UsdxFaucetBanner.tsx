import getConfig from 'next/config'
import { useMemo } from 'react'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useAccount } from 'wagmi'

import { showUsdxToastError, showUsdxToastSuccess } from '@/constants/usdxToast'
import { useUsdxFaucetClaim } from '@/hooks/useUsdxFaucetClaim'
import { useUsdxConfig } from '@/hooks/useUsdxHomeData'
import {
  USDX_FAUCET_CLAIM_BOX_LABEL,
  USDX_FAUCET_CLAIM_USDT_LABEL,
  shouldShowUsdxFaucet,
} from '@/utils/usdx/faucetViews'
import { isUserRejectedWalletError } from '@/utils/walletErrors'
import { UsdxIcon } from './UsdxIcon'

const { publicRuntimeConfig } = getConfig()

type TProps = {
  onConnect: () => void
  onSuccess?: () => void | Promise<void>
}

const UsdxFaucetBannerInner = ({ onConnect, onSuccess }: TProps) => {
  const { i18n } = useLingui()
  const { isConnected, chainId } = useAccount()
  const usdx = useUsdxConfig()
  const targetChainId = usdx?.chainId
  const { claimAll, submitting, step } = useUsdxFaucetClaim()
  const stepLabel = useMemo(
    () =>
      step === 'usdt' ? t`Claiming tUSDT…` : step === 'box' ? t`Claiming tBox…` : '',
    [i18n.locale, step]
  )

  const onClaim = async () => {
    if (!isConnected) {
      onConnect()
      return
    }
    if (targetChainId && chainId !== targetChainId) {
      showUsdxToastError(t`Please switch to BNB Smart Chain`)
      return
    }
    try {
      await claimAll()
      await onSuccess?.()
      showUsdxToastSuccess(t`Test tokens received`)
    } catch (e) {
      if (!isUserRejectedWalletError(e)) {
        const msg = e instanceof Error ? e.message : t`Failed to claim test tokens, please try again`
        showUsdxToastError(msg)
      }
    }
  }

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-12)' }}>
      <div className="card-title" style={{ padding: 'var(--sp-16) var(--sp-18) 0' }}>
        {t`Test tokens`}
      </div>
      <div
        style={{
          padding: 'var(--sp-10) var(--sp-18) var(--sp-12)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--text-2)',
        }}
      >
        <Trans>
          BSC TEST pays with <b>tUSDT</b> / <b>tBox</b>; pricing still uses the real BOX/USDT TWAP. Do
          not confuse them with mainnet tokens.
        </Trans>
      </div>
      <div className="cta-bar cta-bar--inline" style={{ paddingTop: 0 }}>
        <button
          className={`btn btn-secondary btn-md btn-block${submitting ? ' is-loading' : ''}`}
          type="button"
          disabled={submitting}
          onClick={() => void onClaim()}
        >
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden />
              {stepLabel || t`Claiming…`}
            </>
          ) : !isConnected ? (
            <>
              <UsdxIcon name="wallet" />
              {t`Connect wallet to claim`}
            </>
          ) : (
            t`Claim ${USDX_FAUCET_CLAIM_USDT_LABEL} tUSDT + ${USDX_FAUCET_CLAIM_BOX_LABEL} tBox`
          )}
        </button>
      </div>
    </div>
  )
}

export const UsdxFaucetBanner = (props: TProps) => {
  if (!shouldShowUsdxFaucet(publicRuntimeConfig)) return null
  return <UsdxFaucetBannerInner {...props} />
}
