import { useEffect, useState } from 'react'

/** 链上 quote（卖出 / 铸造）输入防抖毫秒数 */
export const USDX_CHAIN_QUOTE_DEBOUNCE_MS = 400

/** 延迟更新值，用于输入防抖（如链上 quote 查询） */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
