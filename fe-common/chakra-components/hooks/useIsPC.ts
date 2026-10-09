import { useMediaQuery } from '@chakra-ui/react'

export const useIsPC = (num: number = 768) => {
  // 要注意 ssr 的话，值会默认为 false
  const [isPC] = useMediaQuery(`(min-width: ${num}px)`)
  return isPC
}
