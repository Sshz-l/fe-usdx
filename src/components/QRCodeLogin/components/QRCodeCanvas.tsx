import React, { useRef, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { Box } from '@chakra-ui/react'

interface QRCodeCanvasProps {
  qrCodeUrl: string
  status: string
  opacity?: number
  filter?: string
}

const QRCodeCanvas: React.FC<QRCodeCanvasProps> = ({ qrCodeUrl, status: _status, opacity = 1, filter = 'none' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateQRCodeImage = useCallback(async () => {
    if (!qrCodeUrl) return
    try {
      if (canvasRef.current) {
        canvasRef.current.width = 160
        canvasRef.current.height = 160
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
        await QRCode.toCanvas(canvasRef.current, qrCodeUrl, {
          width: 160,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#ffffff',
          }
        })
      } else {
        setTimeout(() => {
          generateQRCodeImage()
        }, 200)
      }
    } catch (err) {
      console.error('生成二维码失败:', err)
    }
  }, [qrCodeUrl])

  useEffect(() => {
    if (qrCodeUrl) {
      const timer = setTimeout(() => {
        generateQRCodeImage()
      }, 50)
      return () => {
        clearTimeout(timer)
      }
    }
  }, [qrCodeUrl, generateQRCodeImage])

  return (
    <Box position="relative" width="100%" height="100%">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          opacity,
          filter
        }}
        width="160"
        height="160"
      />
    </Box>
  )
}

export default QRCodeCanvas
