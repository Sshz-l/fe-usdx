const applyAttr = (el, name, value) => {
  if (!el) return
  if (value == null || value === false) {
    el.removeAttribute(name)
    return
  }
  el.setAttribute(name, value === true ? '' : String(value))
}

const getUsdxThemeFromSearch = (search) => {
  const raw = String(search || '')
  const q = raw.startsWith('?') ? raw.slice(1) : raw
  return new URLSearchParams(q).get('theme') === 'dark' ? 'dark' : 'light'
}

const shouldUsdxBarScrolled = (scrollY) => Number(scrollY) > 4

const applyUsdxBodyScreen = (screen, body) => {
  applyAttr(body, 'data-screen', screen || 's-mint')
}

const applyUsdxBodyScrolled = (scrolled, body) => {
  applyAttr(body, 'data-scrolled', scrolled ? true : null)
}

const applyUsdxHtmlTheme = (theme, html) => {
  if (!html) return
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark')
    return
  }
  if (html.getAttribute('data-theme') === 'dark') {
    html.removeAttribute('data-theme')
  }
}

module.exports = {
  getUsdxThemeFromSearch,
  shouldUsdxBarScrolled,
  applyUsdxBodyScreen,
  applyUsdxBodyScrolled,
  applyUsdxHtmlTheme,
}
