export const APP_LOCALES = [
  'en',
  'zh',
  'japanese',
  'korean',
  'vietnamese',
  'spanish',
  'portuguese',
] as const

export type TAppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_LOCALE: TAppLocale = 'zh'

const APP_LOCALE_CONFIG: Record<
  TAppLocale,
  {
    label: string
    icon: string
  }
> = {
  en: {
    label: 'English',
    icon: 'En',
  },
  zh: {
    label: '简体中文',
    icon: '中',
  },
  japanese: {
    label: '日本語',
    icon: '日',
  },
  korean: {
    label: '한국어',
    icon: '한',
  },
  vietnamese: {
    label: 'Tiếng Việt',
    icon: 'Vi',
  },
  spanish: {
    label: 'Español',
    icon: 'Es',
  },
  portuguese: {
    label: 'Português',
    icon: 'Pt',
  },
}

export const APP_LOCALE_OPTIONS = APP_LOCALES.map((locale) => {
  const { label, icon } = APP_LOCALE_CONFIG[locale]

  return {
    locale,
    label,
    icon,
  }
})

const LOCALE_ALIAS_MAP = Object.assign(Object.create(null), {
  en: 'en',
  'en-us': 'en',
  en_us: 'en',
  zh: 'zh',
  'zh-cn': 'zh',
  zh_cn: 'zh',
  'zh-hans': 'zh',
  zh_hans: 'zh',
  ja: 'japanese',
  'ja-jp': 'japanese',
  ja_jp: 'japanese',
  japanese: 'japanese',
  ko: 'korean',
  'ko-kr': 'korean',
  ko_kr: 'korean',
  korean: 'korean',
  vi: 'vietnamese',
  'vi-vn': 'vietnamese',
  vi_vn: 'vietnamese',
  vietnamese: 'vietnamese',
  es: 'spanish',
  'es-es': 'spanish',
  es_es: 'spanish',
  'es-mx': 'spanish',
  es_mx: 'spanish',
  spanish: 'spanish',
  pt: 'portuguese',
  'pt-pt': 'portuguese',
  pt_pt: 'portuguese',
  'pt-br': 'portuguese',
  pt_br: 'portuguese',
  portuguese: 'portuguese',
}) as Record<string, TAppLocale>

export const normalizeLocaleInput = (input?: string | null): TAppLocale | null => {
  if (!input) return null

  const normalized = String(input).trim().toLowerCase()
  const hit = LOCALE_ALIAS_MAP[normalized]
  return hit && (APP_LOCALES as readonly string[]).includes(hit) ? hit : null
}
