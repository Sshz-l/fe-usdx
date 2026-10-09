'use client'

import { Center, Spinner, SpinnerProps } from '@chakra-ui/react'

export const Loading = (props: SpinnerProps) => (
  <Center overflow='hidden'>
    <Spinner size='lg' color='blackAlpha.700' {...props} />
  </Center>
)

export default Loading

export const DynamicLoading = () => (
  <Center h='100%' w='100%'>
    <Spinner size='lg' color='blackAlpha.700' />
  </Center>
)
