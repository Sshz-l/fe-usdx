'use client'

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
  type ModalContentProps,
  type ModalCloseButtonProps,
  type ModalHeaderProps,
  type ModalOverlayProps,
} from '@chakra-ui/react'
import {
  Children,
  ReactElement,
  cloneElement,
  JSXElementConstructor,
  useState,
  useCallback,
} from 'react'
import Confetti from 'react-confetti'
import { useDeepCompareEffect } from 'ahooks'

import { px2vw } from '@fe-common/sdk/src/utils'
import { useIsPC } from '../../hooks/useIsPC'

const isServer = typeof window === 'undefined'

interface ModalViewProps<TData> {
  title?: string | ((data?: any) => string)
  isOpen: boolean
  onClose: () => void
  data?: TData
  children:
    | ReactElement<any, string | JSXElementConstructor<any>>
    | ((props: {
        isOpen: boolean
        onClose: () => void
        data?: TData
      }) => ReactElement<any, string | JSXElementConstructor<any>>)
  contentProps?: ModalContentProps
  closeButtonProps?: ModalCloseButtonProps
  headerProps?: ModalHeaderProps
  hasCloseBtn?: boolean
  closeOnOverlayClick?: boolean
  hasConfetti?: boolean
  blockScrollOnMount?: boolean
  overlayProps?: ModalOverlayProps
}

function ModalView<TData>({
  title,
  onClose,
  isOpen,
  children,
  data,
  hasCloseBtn = true,
  contentProps,
  closeButtonProps,
  overlayProps,
  headerProps,
  closeOnOverlayClick,
  hasConfetti = false,
  blockScrollOnMount = true,
}: ModalViewProps<TData>) {
  const isPC = useIsPC()
  return (
    <Modal
      onClose={onClose}
      isOpen={isOpen}
      motionPreset="slideInBottom"
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={false}
      closeOnOverlayClick={typeof closeOnOverlayClick !== 'undefined' ? closeOnOverlayClick : true}
      scrollBehavior={isPC ? 'outside' : 'inside'}
      isCentered={isPC}
      blockScrollOnMount={blockScrollOnMount}
      useInert={false}
      trapFocus={false}
    >
      <ModalOverlay pr="17px" {...overlayProps}>
        {hasConfetti ? <Confetti /> : null}
      </ModalOverlay>

      <ModalContent
        my="0"
        pos="absolute"
        left={{ base: '0', lg: 'auto' }}
        bottom={{ base: '0', lg: 'auto' }}
        w={{ base: px2vw(750), lg: '400px' }}
        minW={{ base: px2vw(750), lg: '400px' }}
        maxW={{ base: px2vw(750), lg: '400px' }}
        maxH="100vh"
        bgSize="100% 100%"
        borderRadius={{ base: `${px2vw(24)} ${px2vw(24)} 0 0`, lg: '12px' }}
        p={0}
        {...contentProps}
      >
        {title && (
          <ModalHeader
            pos="relative"
            fontSize={'18px'}
            lineHeight={'24px'}
            fontWeight="500"
            color="#000000"
            px={'21px'}
            pt={'16px'}
            pb={'16px'}
            borderStyle="solid"
            borderBottomWidth={'1px'}
            borderColor="rgba(224, 226, 228, 1)"
            {...headerProps}
          >
            {typeof title === 'function' ? title?.(data) : title}
          </ModalHeader>
        )}
        {hasCloseBtn && (
          <ModalCloseButton
            zIndex={2}
            top={`${16 + 12}px`}
            transform={'translateY(-50%)'}
            right={'21px'}
            w={'24px'}
            h={'24px'}
            color={'#fff'}
            fontSize={10}
            borderRadius={'100px'}
            background={'rgba(0,0,0,0.4)'}
            _hover={{
              lg: {
                background: 'rgba(0,0,0,0.3)',
              },
            }}
            _active={{
              background: 'rgba(0,0,0,0.3)',
            }}
            {...closeButtonProps}
          />
        )}
        {/* scrollBehavior="inside" 时候 overflow="auto"， 会导致隐藏内容区 */}
        <ModalBody overflow="visible" p="0">
          {typeof children === 'function'
            ? children({
                isOpen,
                onClose,
                data,
              })
            : children
            ? Children.map(children, (child) =>
                child
                  ? cloneElement(child, {
                      isOpen,
                      onClose,
                      data,
                    })
                  : child
              )
            : children}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ModalView

export function useModal<TData = any>(
  opts: Pick<
    ModalViewProps<TData>,
    | 'title'
    | 'children'
    | 'data'
    | 'contentProps'
    | 'closeButtonProps'
    | 'headerProps'
    | 'hasCloseBtn'
    | 'closeOnOverlayClick'
    | 'hasConfetti'
    | 'blockScrollOnMount'
    | 'overlayProps'
  >
) {
  const { data: defaultData, children, ...resOpts } = opts

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [data, setData] = useState<TData | undefined>(defaultData)
  const [optsData, setOptsData] = useState(resOpts)

  const ThisModal = (
    <ModalView<TData> data={data} isOpen={isOpen} onClose={onClose} {...optsData}>
      {children}
    </ModalView>
  )

  const onOpenFn = useCallback(
    (
      v?: TData,
      opts?: Pick<
        ModalViewProps<TData>,
        | 'title'
        | 'contentProps'
        | 'closeButtonProps'
        | 'headerProps'
        | 'hasCloseBtn'
        | 'closeOnOverlayClick'
        | 'hasConfetti'
        | 'blockScrollOnMount'
        | 'overlayProps'
      >
    ) => {
      typeof opts !== 'undefined' && opts && setOptsData({ ...optsData, ...opts })

      setData(v)

      setTimeout(() => {
        onOpen()
      }, 100)
    },
    [onOpen, optsData]
  )

  useDeepCompareEffect(() => {
    typeof resOpts !== 'undefined' && optsData && setOptsData({ ...optsData, ...resOpts })
  }, [resOpts])

  return {
    isOpen,
    onOpen: onOpenFn,
    onClose,
    Modal: isServer ? null : ThisModal,
  }
}
