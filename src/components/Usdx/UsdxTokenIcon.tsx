export const USDX_TOKEN_ICONS = {
  USDT: 'https://www.iconaves.com/token_icon/bsc/0x55d398326f99059ff775485246999027b3197955.png',
  BOX: 'https://www.iconaves.com/token_icon/bsc/0x6386adc4bc9c21984e34fd916bb349dd861742af.png',
} as const

type TProps = {
  sym: keyof typeof USDX_TOKEN_ICONS
}

export const UsdxTokenIcon = ({ sym }: TProps) => (
  <span className="token-ic">
    <span className="avatar avatar-round avatar-32">
      <img src={USDX_TOKEN_ICONS[sym]} alt={sym} />
    </span>
  </span>
)
