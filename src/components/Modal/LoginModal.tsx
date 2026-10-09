import React, { useCallback, useEffect } from 'react'
import getConfig from 'next/config'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/macro'

import { useModal } from '@fe-common/chakra-components/src/Modal'
import { ConnectWalletMulti } from '@fe-common/chakra-components/src/Modal/ConnectWalletMulti'
import { useStore } from '@/stores'
import { px2vw } from '@fe-common/sdk/src/utils'
import ConnectWalletQRCode from '@/components/QRCodeLogin/ConnectWalletQRCode'
import { useDeBoxDirectConnect } from '@/hooks/useDeBoxDirectConnect'

const { publicRuntimeConfig } = getConfig()

export const LoginModal = () => {
  const { walletStore } = useStore()
  const { i18n } = useLingui()
  const { tryDeBoxDirectConnect } = useDeBoxDirectConnect()
  const cdnPrefix = publicRuntimeConfig?.cdn || ''

  const isPremiumManageRoute = typeof window !== 'undefined' &&
    window.location.pathname === '/premium/manage/'

  const { Modal, isOpen, onClose, onOpen } = useModal({
    children: ({ onClose: modalClose, data }) => {
      const finalCustomComponents = isPremiumManageRoute
        ? [
            {
              type: 'qrcode',
              title: i18n._(t`SCAN`),
              component: <ConnectWalletQRCode loginType="login" onClose={modalClose} />,
              disable: false,
            },
          ]
        : []

      const modalLocale: 'zh' | 'en' = i18n.locale === 'zh' ? 'zh' : 'en'

      return (
        <ConnectWalletMulti
          onClose={modalClose}
          data={{
            ...data,
            brandLogo: `${cdnPrefix}/usdx/assets/usdx.png`,
            welcomeTitle: modalLocale === 'zh' ? '欢迎使用' : 'Welcome',
          }}
          locale={modalLocale}
          customComponents={finalCustomComponents}
        />
      )
    },
    contentProps: {
      w: { base: px2vw(750), lg: 'max-content' },
      maxW: { base: px2vw(750), lg: 'max-content' },
    },
  })

  const handleOpen = useCallback(
    async (data?: Parameters<typeof onOpen>[0]) => {
      const { handled } = await tryDeBoxDirectConnect(data)
      if (!handled) {
        onOpen(data)
      }
    },
    [onOpen, tryDeBoxDirectConnect]
  )

  useEffect(() => {
    walletStore.setLoginModal({ isOpen, onClose, onOpen: handleOpen })
  }, [walletStore, isOpen, onClose, handleOpen])

  return Modal
}