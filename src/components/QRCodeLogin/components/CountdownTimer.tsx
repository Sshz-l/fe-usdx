import React from 'react'
import { Box, Text, Button } from '@chakra-ui/react'
import { t } from '@lingui/macro'

interface CountdownTimerProps {
  status: string
  countdown: number
  onCancel: () => void
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ status, countdown, onCancel }) => {
  // 处理待扫描状态显示倒计时
  if (status === 'pending') {
    return (
      <Box width="100%" display="flex" justifyContent="center">
        <Box 
          width="80px" 
          height="36px" 
          borderRadius="30px" 
          border="1px solid #e0e0e0" 
          display="flex" 
          lineHeight={36}
          alignItems="center" 
          justifyContent="center"
        >
          <Text fontSize="sm" fontWeight="medium">
            {countdown}s
          </Text>
        </Box>
      </Box>
    )
  }

  // 处理已扫描状态显示取消按钮
  if (status === 'scaned') {
    return (
      <Box width="100%" display="flex" justifyContent="center">
        <Button 
          variant="link" 
          color="blue.500" 
          onClick={onCancel}
          fontSize="sm"
        >
          {t`Cancel authorization`}
        </Button>
      </Box>
    )
  }

  return null
}

export default CountdownTimer
