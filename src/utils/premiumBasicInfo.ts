/** 授权用户基础信息（/authorized_user/v1/basic-info） */
export type TPremiumMemberTierKey = 'iron' | 'green' | 'gold'

export type TPremiumUserMark = {
  name?: string
  type?: string
  url: string
  width?: number
  height?: number
  level?: number
}

export type TPremiumBasicInfo = {
  avatar?: string
  name?: string
  premiumLevelKey?: TPremiumMemberTierKey
  userMarks: TPremiumUserMark[]
  level?: number
  levelMarkUrl?: string
  /** 原始过期时间（ISO 或时间戳字符串） */
  expireTimeRaw?: string
  /** 展示用 YYYY/MM/DD */
  expireDate: string
  remainDays: number | null
  isExpired: boolean
  isGold: boolean
}

export const formatPremiumExpireDate = (input?: string | number) => {
  if (input == null || input === '') return ''
  const ts = typeof input === 'number' ? input : Date.parse(input)
  if (Number.isNaN(ts)) return ''
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

export const calcRemainDays = (expireTime?: string | number) => {
  if (expireTime == null || expireTime === '') return null
  const ts = typeof expireTime === 'number' ? expireTime : Date.parse(expireTime)
  if (Number.isNaN(ts)) return null
  const diffMs = ts - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

const resolveMarkUrl = (mark: Record<string, unknown>) =>
  String(mark.url ?? mark.icon ?? mark.image ?? mark.imageUrl ?? mark.img ?? '')

export const parsePremiumUserMarks = (raw: unknown): TPremiumUserMark[] => {
  if (!Array.isArray(raw)) return []

  const marks: TPremiumUserMark[] = []
  const seen = new Set<string>()

  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const mark = item as Record<string, unknown>
    const type = String(mark.type || '').toLowerCase()
    const okType = !type || type === 'image' || type === 'img'
    const url = resolveMarkUrl(mark)
    if (!okType || !url) return

    const key = `${String(mark.name || '')}|${url}`
    if (seen.has(key)) return
    seen.add(key)

    marks.push({
      name: String(mark.name || ''),
      type: String(mark.type || ''),
      url,
      width: typeof mark.width === 'number' ? mark.width : undefined,
      height: typeof mark.height === 'number' ? mark.height : undefined,
      level: typeof mark.level === 'number' ? mark.level : undefined,
    })
  })

  return marks
}

export const parsePremiumBasicInfo = (response: unknown): TPremiumBasicInfo => {
  const body = (response as { data?: unknown })?.data ?? response
  const payload =
    body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)
      ? (body as { data?: Record<string, unknown> }).data
      : (body as Record<string, unknown> | undefined)

  const record = (payload || {}) as Record<string, unknown>
  const premiumLevel = String(record.premium_level || record.premiumLevel || '').toLowerCase()
  const premiumLevelKey =
    premiumLevel === 'gold' || premiumLevel === 'green' || premiumLevel === 'iron'
      ? (premiumLevel as TPremiumMemberTierKey)
      : undefined

  const expireTimeRaw = String(
    record.expire_time ?? record.expireTime ?? record.member_expire_at ?? ''
  )
  const remainDays = calcRemainDays(expireTimeRaw || undefined)
  const isExpired = remainDays === 0
  const expireDate = formatPremiumExpireDate(expireTimeRaw || undefined)

  const userMarks = parsePremiumUserMarks(record.user_mark)
  const levelMark = userMarks.find((m) => /user_level/i.test(m.name || ''))
  const levelFromMarks = levelMark?.level
  const levelMarkUrl = levelMark?.url

  return {
    avatar: String(
      record.pic ?? record.avatar ?? record.head_img ?? record.avatar_url ?? ''
    ) || undefined,
    name: String(record.name ?? record.nickname ?? record.user_name ?? '') || undefined,
    premiumLevelKey,
    userMarks,
    level:
      levelFromMarks ??
      (typeof (record.user_level_mark as { level?: number } | undefined)?.level === 'number'
        ? (record.user_level_mark as { level: number }).level
        : undefined) ??
      (typeof record.level === 'number' ? record.level : undefined) ??
      (typeof record.lv === 'number' ? record.lv : undefined),
    levelMarkUrl,
    expireTimeRaw: expireTimeRaw || undefined,
    expireDate,
    remainDays,
    isExpired,
    isGold: premiumLevelKey === 'gold' && !isExpired,
  }
}
