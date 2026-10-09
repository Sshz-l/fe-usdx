const { i18n: defaultI18n } = require('@lingui/core')
const { generateMessageId } = require('@lingui/message-utils/generateMessageId')

const LOCALE_BCP47 = {
  en: 'en-US',
  zh: 'zh-CN',
  japanese: 'ja-JP',
  korean: 'ko-KR',
  vietnamese: 'vi-VN',
  spanish: 'es-ES',
  portuguese: 'pt-BR',
}

/** Webpack may bundle CJS/ESM copies of @lingui/core; bind the I18nProvider instance. */
let activeI18n = defaultI18n

const bindUsdxI18n = (next) => {
  if (next) activeI18n = next
}

/** Compiled catalogs use hashed ids; pass the source msgid so missing keys fall back to English. */
const usdxT = (message, values) =>
  activeI18n._({ id: generateMessageId(message), message }, values)

const usdxDateLocale = () => LOCALE_BCP47[activeI18n.locale] || 'en-US'

module.exports = {
  bindUsdxI18n,
  usdxT,
  usdxDateLocale,
}
