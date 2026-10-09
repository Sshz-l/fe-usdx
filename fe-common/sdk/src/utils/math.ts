import BigNumber from 'bignumber.js'

export function formatNumFloat(number: any, digits = 0, decPoint = '.') {
  if (number) {
    if (!/^[0-9]+[.]{0,1}[0-9]*$/.test(number)) {
      return false
    }
    if (digits === 0) {
      return new BigNumber(number).toFixed(0)
    }
    const strNum = `${number}`
    const arr = strNum.split(decPoint)
    const floatNum = arr[1]
    if (floatNum?.length > 0) {
      return new BigNumber(number).toFixed(Math.min(floatNum?.length, digits))
    }
    return number
  }
  return ''
}
