export function px2vh(px: number, unit = 1080, ignoreMax = false): string {
  if (!ignoreMax) {
    if (px > unit) {
      return '100vh'
    } else if (px < -1 * unit) {
      return '-100vh'
    }
  }

  // 100vw = ${unit}px
  return `${(px / unit) * 100}vh`
}
export default px2vh
