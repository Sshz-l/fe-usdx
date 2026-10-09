import { i18n, type Messages } from '@lingui/core'
import { useEffect } from 'react'

import { messages as defaultMessages } from '../locale/zh/messages.js'
import { DEFAULT_LOCALE, normalizeLocaleInput, type TAppLocale } from '@/constants/appLocales'
import { bindUsdxI18n } from '@/utils/usdx/usdxI18n'

export type TPageI18nProps = {
  locale: TAppLocale
  messages: Messages
}

export const LOCAL_STORE_KEY = 'DEBOX_PRO_LOCALE_LANG'

// 初始化为默认中文，避免首屏闪烁
i18n.loadAndActivate({ locale: DEFAULT_LOCALE, messages: defaultMessages })
bindUsdxI18n(i18n)

const isBrowser = () => {
  return typeof window !== 'undefined'
}

const getQueryLang = (): string | null => {
  if (!isBrowser()) return null

  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('lang') || url.searchParams.get('locale')
  } catch {
    return null
  }
}

const getBrowserLang = (): string | null => {
  if (!isBrowser()) return null

  return window.navigator?.language || window.navigator?.languages?.[0] || null
}

const loadMessagesModule = async (locale: TAppLocale) => {
  switch (locale) {
    case 'en':
      return import('../locale/en/messages.js')
    case 'zh':
      return import('../locale/zh/messages.js')
    case 'japanese':
      return import('../locale/japanese/messages.js')
    case 'korean':
      return import('../locale/korean/messages.js')
    case 'vietnamese':
      return import('../locale/vietnamese/messages.js')
    case 'spanish':
      return import('../locale/spanish/messages.js')
    case 'portuguese':
      return import('../locale/portuguese/messages.js')
  }
}

export const getLocaleMessages = async (locale: TAppLocale): Promise<TPageI18nProps> => {
  const { messages } = await loadMessagesModule(locale)

  return {
    locale,
    messages,
  }
}

export const activateLocale = ({ locale, messages }: TPageI18nProps) => {
  i18n.loadAndActivate({ locale, messages })
  bindUsdxI18n(i18n)
}

export async function dynamicActivateLanguage(locale: TAppLocale) {
  const localeMessages = await getLocaleMessages(locale)
  activateLocale(localeMessages)

  try {
    if (isBrowser()) {
      window.localStorage?.setItem(LOCAL_STORE_KEY, locale)
    }
  } catch {}
}

export const resolveInitialLocale = (): TAppLocale => {
  if (!isBrowser()) return DEFAULT_LOCALE

  const queryLocale = normalizeLocaleInput(getQueryLang())
  if (queryLocale) return queryLocale

  let storedLocale: TAppLocale | null = null
  try {
    storedLocale = normalizeLocaleInput(window.localStorage?.getItem(LOCAL_STORE_KEY))
  } catch {}

  if (storedLocale) return storedLocale

  const browserLocale = normalizeLocaleInput(getBrowserLang())
  return browserLocale || DEFAULT_LOCALE
}

export function useLinguiInit() {
  useEffect(() => {
    const finalLocale = resolveInitialLocale()

    if (finalLocale !== i18n.locale) {
      dynamicActivateLanguage(finalLocale).catch((error) => {
        console.error('Failed to activate locale', error)
      })
    }
  }, [])

  return i18n
}
