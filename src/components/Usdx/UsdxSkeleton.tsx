import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

/**
 * 尺寸对齐铸造首屏（52px 品牌栏 / 44px 一级导航 / 卡片 8px 圆角），切换到真实页面时不跳版。
 * 暗色不能靠 html[data-theme]：Chakra ColorModeScript / Provider 会在 UsdxApp 挂载前把它改回 light，
 * 故由 UsdxHead 另写 data-usdx-theme，下方暗色值需与 tokens.css / usdx-page.css 的 dark 段保持一致。
 */
const SKELETON_CSS = `
  html[data-usdx-theme="dark"]:has(.usdx-skeleton),
  html[data-usdx-theme="dark"]:has(.usdx-skeleton) body {
    background: #2A2A2D !important;
  }
  html[data-usdx-theme="dark"] .usdx-skeleton {
    color-scheme: dark;
    --bg-surface: #1A1A1C;
    --bg-group: #2A2A2D;
    --bg-subtle: #202022;
    --border-2: rgba(255,255,255,0.08);
    --text-1: rgba(255,255,255,0.898);
    --top-glow-brand: 28%;
    --top-glow-amber: 16%;
    --bottom-glow-brand: 17%;
    --bottom-glow-amber: 10%;
  }
  .usdx-skeleton .usdx-sk-bar {
    height: var(--appbar-h, 52px);
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 0 16px;
  }
  .usdx-skeleton .usdx-sk-tabs {
    height: var(--tabs-h, 44px);
    display: flex; align-items: center; justify-content: space-around;
    padding: 0 16px;
    border-bottom: 0.5px solid var(--border-2, #e5e5e5);
  }
  .usdx-skeleton .usdx-sk-body {
    display: flex; flex-direction: column; gap: 12px;
    padding: 12px 16px 20px;
  }
  .usdx-skeleton .usdx-sk-card {
    display: flex; flex-direction: column; gap: 14px;
    padding: 16px;
    border: 1px solid var(--border-2, #e5e5e5); border-radius: 8px;
    background: var(--bg-surface, #fff);
  }
  .usdx-skeleton .usdx-sk-card--amount { min-height: 191px; }
  .usdx-skeleton .usdx-sk-row { display: flex; justify-content: space-between; gap: 16px; }
  .usdx-skeleton .usdx-sk {
    display: block; height: 14px; border-radius: 4px;
    background: linear-gradient(90deg,
      var(--bg-group, #efefef) 25%, var(--bg-subtle, #f8f8f8) 37%, var(--bg-group, #efefef) 63%);
    background-size: 400% 100%;
    animation: usdx-sk-shimmer 1.4s ease infinite;
  }
  .usdx-skeleton .usdx-sk--pill { width: 96px; height: 32px; border-radius: 9999px; }
  .usdx-skeleton .usdx-sk--tab { width: 32px; height: 16px; }
  .usdx-skeleton .usdx-sk--xl { height: 32px; }
  .usdx-skeleton .usdx-sk--w25 { width: 25%; }
  .usdx-skeleton .usdx-sk--w35 { width: 35%; }
  .usdx-skeleton .usdx-sk--w55 { width: 55%; }
  .usdx-skeleton .usdx-sk--cta { height: 48px; margin-top: 12px; border-radius: 9999px; }
  @keyframes usdx-sk-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .usdx-skeleton .usdx-sk { animation: none; }
  }
`

const SkeletonRow = () => (
  <div className="usdx-sk-row">
    <span className="usdx-sk usdx-sk--w25" />
    <span className="usdx-sk usdx-sk--w35" />
  </div>
)

export const UsdxSkeleton = () => {
  const cdnPrefix = publicRuntimeConfig.cdn || ''

  return (
    <div className="app-frame usdx-skeleton" aria-busy="true" aria-label="Loading USDX page">
      <style dangerouslySetInnerHTML={{ __html: SKELETON_CSS }} />
      <div className="usdx-sk-bar">
        <div className="brand">
          <img
            className="brand-mark"
            src={`${cdnPrefix}/usdx/assets/usdx.png`}
            alt=""
            role="presentation"
          />
          <span className="brand-name">USDX-Stablecoin</span>
        </div>
        <span className="usdx-sk usdx-sk--pill" />
      </div>
      <div className="usdx-sk-tabs">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="usdx-sk usdx-sk--tab" />
        ))}
      </div>
      <div className="usdx-sk-body">
        <div className="usdx-sk-card usdx-sk-card--amount">
          <span className="usdx-sk usdx-sk--w25" />
          <span className="usdx-sk usdx-sk--xl usdx-sk--w55" />
          <span className="usdx-sk usdx-sk--w35" />
        </div>
        <div className="usdx-sk-card">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
        <span className="usdx-sk usdx-sk--cta" />
      </div>
    </div>
  )
}
