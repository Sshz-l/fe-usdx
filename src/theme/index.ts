import { extendTheme, theme as baseTheme, type ThemeConfig } from '@chakra-ui/react'

import px2vw from '../../fe-common/sdk/src/utils/px2vw' // 用别名会导致chakra ui cli报错
import styles from './styles'
import borders from '../../fe-common/chakra-components/theme/foundations/borders'
import components from './components'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

const breakpoints = {
  ssm: '320px',
  sm: '768px',
  md: '768px',
  lg: '768px',
  xl: '1080px',
  xxl: '1440px',
}

const colors = {
  ...baseTheme.colors,
  white: '#FFFFFF',
  black: '#000000',
  // gray: {
  //   '200': '#AFAFB0',
  //   '400': '#373739',
  //   '500': '#2A2A2D',
  //   '600': '#252529',
  //   '700': '#1A1A1B',
  // },
  green: {
    500: '#21C161', // '#44E671',
  },
  blue:{
    500: '#B6BFFF',
  }
}

const textStyles = {
  '12': {
    fontSize: {
      base: px2vw(24),
      lg: '12px',
    },
    lineHeight: 1,
  },
  '14': {
    fontSize: {
      base: px2vw(28),
      lg: '14px',
    },
    lineHeight: 1,
  },
  '16': {
    fontSize: {
      base: px2vw(32),
      lg: '16px',
    },
    lineHeight: 1,
  },
  '18': {
    fontSize: {
      base: px2vw(36),
      lg: '18px',
    },
    lineHeight: 1,
  },
}

const layerStyles = {}

// https://chakra-ui.com/docs/theming/theme
const theme = extendTheme({
  config,
  colors,
  fonts: {
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  },
  sizes: {
    md: '768px',
    lg: '768px',
    xl: '1080px',
    xxl: '1440px',
  },
  styles,
  borders,
  components,
  breakpoints,
  layerStyles,
  textStyles,
})

export default theme
