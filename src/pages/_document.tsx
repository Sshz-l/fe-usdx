import Document, { Html, Head, Main, NextScript } from 'next/document'
import { ColorModeScript } from '@chakra-ui/react'

import theme from '@/theme'
import { STORAGE_KEY } from '@/constants/theme'

class UsdxSiteDocument extends Document {
  render() {
    return (
      <Html lang="en" translate="no">
        <Head />
        <body>
          <ColorModeScript initialColorMode={theme.config.initialColorMode} storageKey={STORAGE_KEY} />
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default UsdxSiteDocument
