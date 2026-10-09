import React, { useEffect, useState } from 'react'
import { VStack, Text, Center, Spinner } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { generateQRCode } from '@/services/qrcode'
import QRCodeStore from '@/stores/qrcodeStore'
import QRCodeStatus from './components/QRCodeStatus'
import CountdownTimer from './components/CountdownTimer'
import { useStore } from '@/stores'
import { t } from '@lingui/macro'

interface ConnectWalletQRCodeProps {
  onKeyExchangeSuccess?: (decryptedKey: string) => void
  onClose?: () => void
  isVisible?: boolean
  loginType?: 'exchange_ecdh_key' | 'login'
}

const ConnectWalletQRCode: React.FC<ConnectWalletQRCodeProps> = ({
  onKeyExchangeSuccess = () => {},
  onClose = () => {},
  isVisible = false,
  loginType = 'exchange_ecdh_key'
}) => {
  const { walletStore } = useStore()

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(60)
  const [qrCodeStore] = useState(() => new QRCodeStore())
  const hasGeneratedRef = React.useRef(false)
  const generateCodeMutationRef = React.useRef<any>(null)

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const params = loginType === 'login' ? 'login' : 'exchange_ecdh_key'
      // 官网扫码登录必须显式传 source=0，后端走 uid_website_* 链路
      const source = loginType === 'login' ? 0 : undefined
      const response = await generateQRCode(params, source)
      if (!response || !response.data || !response.data.data) {
        throw new Error('响应格式不正确')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      const tempCodeId = data.temp_code_id
      qrCodeStore.setTempCodeId(tempCodeId)

      const userUcode = walletStore.curAccountInfo?.invite_code || ''
      const url = `debox://auth/exchange?token=${tempCodeId}&ucode=${userUcode}&type=login&next=/rn/qrcode/authorization`
      setQrCodeUrl(url)
      qrCodeStore.setStatus('pending')
      qrCodeStore.setType(loginType)
      setCountdown(data.expire_time)
      qrCodeStore.startPolling(tempCodeId, () => onKeyExchangeSuccess(''))
    },
    onError: (error) => {
      console.error('生成二维码失败:', error)
    }
  })

  useEffect(() => {
    generateCodeMutationRef.current = generateCodeMutation

    if (isVisible && !hasGeneratedRef.current) {
      generateCodeMutation.mutate()
      hasGeneratedRef.current = true
    }
  }, [generateCodeMutation, isVisible])

  useEffect(() => {
    let countdownTimer: NodeJS.Timeout | number | null

    if (qrCodeStore.status === 'pending' && countdown > 0) {
      countdownTimer = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            qrCodeStore.setStatus('expired')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (qrCodeStore.status === 'pending' && countdown === 0) {
      qrCodeStore.setStatus('expired')
    }

    return () => {
      if (countdownTimer) {
        window.clearInterval(countdownTimer)
      }
    }
  }, [qrCodeStore.status, qrCodeStore, countdown])

  useEffect(() => {
    return () => {
      qrCodeStore.destroy()
    }
  }, [qrCodeStore])

  return (
    <VStack spacing={4} alignItems="center">
      {!qrCodeUrl && (generateCodeMutation.isPending || !generateCodeMutationRef.current) ? (
        <Center h="160px">
          <Spinner size="xl" />
        </Center>
      ) : (
        <>
          {qrCodeUrl && (
            <VStack spacing={3} width="100%" alignItems="center">
              {qrCodeStore.status !== 'scaned' && (
                <Text color="green.500" fontSize="lg" fontWeight="bold">{t`Scan to log in to DeBox`}</Text>
              )}

              <QRCodeStatus
                status={qrCodeStore.status}
                qrCodeUrl={qrCodeUrl}
                onRefresh={() => generateCodeMutation.mutate()}
              />

              {qrCodeStore.status === 'expired' && (
                <Text fontSize="sm" color="red.500" marginTop={2}>
                  {t`QR code expired, please refresh`}
                </Text>
              )}

              <CountdownTimer
                status={qrCodeStore.status}
                countdown={countdown}
                onCancel={onClose}
              />
            </VStack>
          )}
        </>
      )}
    </VStack>
  )
}

export default ConnectWalletQRCode
