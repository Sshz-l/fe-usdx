import dynamic from 'next/dynamic'
import getConfig from 'next/config'

import { UsdxHead } from '@/components/Usdx/UsdxHead'
import { UsdxSkeleton } from '@/components/Usdx/UsdxSkeleton'

const UsdxStablecoinPage = dynamic(
  () => import('@/components/Usdx/UsdxStablecoinPage').then((mod) => mod.UsdxStablecoinPage),
  {
    ssr: false,
    loading: () => <UsdxSkeleton />,
  }
)

const Page = () => {
  return (
    <>
      <UsdxHead />
      <UsdxStablecoinPage />
    </>
  )
}

export default Page

export const getStaticProps = async () => {
  const { publicRuntimeConfig } = getConfig()
  return {
    props: {
      title: 'USDX 稳定币',
      description: 'USDX 稳定币协议：铸造、稳定器 1:1 兑换、双资产赎回与待解锁释放计划领取。',
      /** USDX 纯链上交互，不触发 DeBox 账号签名登录 */
      skipAuthLogin: true,
      openGraph: {
        title: 'USDX 稳定币',
        description: '铸造 USDX、稳定器兑换、按国库构成赎回与每日释放领取。',
        url: `${publicRuntimeConfig.siteUrl}/`,
      },
    },
  }
}
