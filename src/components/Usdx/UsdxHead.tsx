import Head from 'next/head'
import getConfig from 'next/config'

import { getUsdxSharedStyleUrl } from '@/utils/usdx/sharedAssets'

const { publicRuntimeConfig } = getConfig()

/** 用 dangerouslySetInnerHTML 输出：静态导出会把 <style> 文本子节点里的引号转义成 &quot;，CSS 失效 */
const USDX_ROOT_CSS = `
  html:has(.usdx-root, .usdx-skeleton),
  html:has(.usdx-root, .usdx-skeleton) body {
    background: var(--bg-group, #efefef) !important;
    overflow-x: visible !important;
    color: var(--text-1, rgba(0,0,0,0.9)) !important;
    font-family: var(--font-zh, "MiSans", "PingFang SC", sans-serif) !important;
  }
`

/**
 * 必须在页面层（参与静态导出）渲染：UsdxApp 是 ssr:false 的客户端组件，
 * 若在其中声明，<link> 会在首屏绘制后才插入，弱网下出现无样式闪烁。
 */
export const UsdxHead = () => {
  const cdnPrefix = publicRuntimeConfig.cdn || ''
  const styleCacheKey = publicRuntimeConfig.version || ''
  const sharedStyle = (fileName: string) =>
    getUsdxSharedStyleUrl(cdnPrefix, fileName, styleCacheKey)

  const buildStamp = [publicRuntimeConfig.version, publicRuntimeConfig.buildTime]
    .filter(Boolean)
    .join(' ')

  return (
    <Head>
      <meta key="usdx-build" name="usdx-build" content={buildStamp} />
      <link key="usdx-tokens-css" rel="stylesheet" href={sharedStyle('tokens.css')} />
      <link key="usdx-components-css" rel="stylesheet" href={sharedStyle('components.css')} />
      <link key="usdx-page-css" rel="stylesheet" href={sharedStyle('usdx-page.css')} />
      <script
        key="usdx-theme"
        dangerouslySetInnerHTML={{
          __html: `if(new URLSearchParams(location.search).get('theme')==='dark'){document.documentElement.dataset.theme='dark';document.documentElement.dataset.usdxTheme='dark';}`,
        }}
      />
      <style key="usdx-root-style" dangerouslySetInnerHTML={{ __html: USDX_ROOT_CSS }} />
    </Head>
  )
}
