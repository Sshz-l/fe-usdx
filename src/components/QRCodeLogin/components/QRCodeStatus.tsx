import React from 'react'
import { Box, Text, Button, Avatar } from '@chakra-ui/react'
import { RepeatIcon } from '@chakra-ui/icons'
import { t } from '@lingui/macro'
import QRCodeCanvas from './QRCodeCanvas'
import { useStore } from '@/stores'
import LogoIcon from '@fe-common/chakra-components/assets/svg/logo.svg'
import { Image } from '@chakra-ui/react'

interface QRCodeStatusProps {
  status: string
  qrCodeUrl: string
  onRefresh: () => void
}

const QRCodeStatus: React.FC<QRCodeStatusProps> = ({ status, qrCodeUrl, onRefresh }) => {
  const { walletStore } = useStore()
  const currentUserAvatar = walletStore.curAccountInfo?.pic || ''

  // 处理过期状态
  if (status === 'expired') {
    return (
      <Box width="160px" height="160px" position="relative" borderRadius="md" overflow="hidden">
        <QRCodeCanvas
          qrCodeUrl={qrCodeUrl}
          status={status}
          opacity={0.4}
          filter="blur(3px)"
        />
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          width="160px"
          height="160px"
          zIndex={2}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={2}
        >
          <RepeatIcon fontSize="4xl" color="gray.500" />
          <Button
            onClick={onRefresh}
            bg="green.500"
            color="white"
            borderRadius="md"
            px={4}
            py={2}
            size="sm"
            _hover={{ bg: 'green.600' }}
          >
            {t`Refresh`}
          </Button>
        </Box>
      </Box>
    )
  }

  // 处理已扫描状态
  if (status === 'scaned') {
    return (
      <Box width="160px" height="160px" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Box width="100%" height="100%" display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={4}>
          <Avatar
            size="lg"
            borderRadius="xl"
            src={currentUserAvatar}
          />
          <Text fontSize="lg" color="green.500" fontWeight="medium">
            {t`Please confirm on your phone`}
          </Text>
        </Box>
      </Box>
    )
  }

  // 处理待扫描状态
  return (
    <Box width="160px" height="160px" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
      <Box position="relative" width="100%" height="100%">
        <QRCodeCanvas qrCodeUrl={qrCodeUrl} status={status} />
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          width="40px"
          height="40px"
          borderRadius="full"
          bg="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxShadow="0 0 4px rgba(0,0,0,0.2)"
        >
          <Image
            src={LogoIcon.src}
            width="30px"
            height="30px"
            alt="Logo"
          />
        </Box>
      </Box>
    </Box>
  )
}

export default QRCodeStatus
