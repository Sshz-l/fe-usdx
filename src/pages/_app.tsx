import { ChakraProvider, createLocalStorageManager } from '@chakra-ui/react'
import { CSSReset } from '@chakra-ui/css-reset'
import type { AppProps } from 'next/app'
import getConfig from 'next/config'
import Head from 'next/head'
import Script from 'next/script'
import { useEffect, useMemo } from 'react'
import { NextSeo } from 'next-seo'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { QueryClient } from '@tanstack/react-query'
import 'react-toastify/dist/ReactToastify.css'

import { useIsPC } from '@fe-common/chakra-components/hooks/useIsPC'
import { setConf } from '@fe-common/sdk/src/utils'
import { useLinguiInit } from '@/hooks/useLinguiInit'
import theme from '@/theme'
import { STORAGE_KEY } from '@/constants/theme'
import { StoreContext, initializeStore } from '@/stores'
import { LoginModal } from '@/components/Modal/LoginModal'
import { WalletProviders } from '@/components/WalletProviders'
import LoginHandler from '@/components/LoginHandler'
import '@/styles/global.css'

const client = new QueryClient()
const isServer = typeof window === 'undefined'
const { publicRuntimeConfig } = getConfig()
const manager = createLocalStorageManager(STORAGE_KEY)

const UsdxSiteApp = ({ Component, pageProps }: AppProps) => {
  useLinguiInit()

  const isPC = useIsPC()
  const stores = useMemo(() => initializeStore({}), [])

  useEffect(() => {
    if (stores.commonStore.isPC !== isPC) {
      stores.commonStore.updateIsPC?.(isPC)
    }
  }, [isPC, stores.commonStore])

  useEffect(() => {
    setConf({
      api: publicRuntimeConfig.api.base,
      gtag: publicRuntimeConfig.gtag,
      ...publicRuntimeConfig,
    })
  }, [])

  const siteUrl: string = publicRuntimeConfig.siteUrl || ''

  return (
    <>
      <NextSeo
        title={pageProps?.openGraph?.title || pageProps.title}
        titleTemplate="%s"
        defaultTitle={publicRuntimeConfig.title}
        description={pageProps?.description || publicRuntimeConfig.description}
        canonical={siteUrl ? `${siteUrl}/` : undefined}
        openGraph={{
          type: 'website',
          title: pageProps.title,
          description: pageProps?.description || publicRuntimeConfig.description,
          ...pageProps?.openGraph,
          images: siteUrl
            ? [{ url: `${siteUrl}/usdx/assets/usdx.png`, alt: 'USDX' }]
            : undefined,
        }}
      />
      <Head>
        <meta charSet="utf-8" />
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"
        />
        <meta content="telephone=no,email=no" name="format-detection" />
        <meta name="keywords" content={publicRuntimeConfig.keywords} />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link href="/images/apple-icon-144x144.png" rel="apple-touch-icon-precomposed" />
      </Head>
      {publicRuntimeConfig.gtag ? (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${publicRuntimeConfig.gtag}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${publicRuntimeConfig.gtag}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      ) : null}

      <I18nProvider i18n={i18n}>
        <ChakraProvider resetCSS={false} theme={theme} colorModeManager={manager}>
          <CSSReset />
          <StoreContext.Provider value={stores}>
            <WalletProviders client={client} needWallet>
              <LoginHandler skipAuthLogin={pageProps.skipAuthLogin === true} />
              <Component {...pageProps} />
              {!isServer && <LoginModal />}
            </WalletProviders>
          </StoreContext.Provider>
        </ChakraProvider>
      </I18nProvider>
    </>
  )
}

export default UsdxSiteApp
