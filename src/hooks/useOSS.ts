import { useCallback, useMemo, useState } from 'react'
import type OSS from 'ali-oss'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { computed } from 'mobx'

import { useStore } from '@/stores'
import { TYPES } from '@/stores/walletStore/ossStore'
export { TYPES } from '@/stores/walletStore/ossStore'

export enum STATE {
  INIT = 0, // 未初始化
  LOADING = 1, // 初始化中
  LOADED = 2, // 常态
  UPLOADING = 3, // 上传中
}

export const useOSS = (type?: 0 | 1 | 2) => {
  useLingui()

  const { walletStore } = useStore()
  const [isLoading, setLoading] = useState(STATE.LOADED)

  const oss = computed(() => {
    if (walletStore?.curUserInfo?.token) {
      return walletStore.getOSS(type)
    }
    return null
  }).get()

  const loading = useMemo(() => {
    if (oss?.loading === STATE.LOADED) {
      return isLoading
    }
    return oss?.loading
  }, [oss?.loading, isLoading])

  const uploadFiles = useCallback(
    async (
      file: File,
      name?: string,
      options?: OSS.PutObjectOptions & {
        type?: TYPES
      }
    ) => {
      if (!file) {
        throw new Error(t`File is required`)
      }
      if (file.size > 1024 * 1024 * 20) {
        throw new Error(t`The file size should be less than ${20}MB.`)
      }

      setLoading?.(STATE.UPLOADING)
      let res = await oss?.put(file, name, options).catch(() => {
        return null
      })
      if (!res) {
        res = await oss?.put(file, name, options).catch((e) => {
          setLoading?.(STATE.LOADED)
          throw e
        })
      }
      console.log('oss put res:', res)
      setLoading?.(STATE.LOADED)
      return res
    },
    [oss, setLoading]
  )

  const multipartUploadFiles = useCallback(
    async (
      file: File,
      name?: string,
      options?: OSS.MultipartUploadOptions & {
        type?: TYPES
      }
    ) => {
      if (!file) {
        throw new Error(t`File is required`)
      }
      setLoading?.(STATE.UPLOADING)
      let res = await oss?.multipartUploadFiles(file, name, options).catch(() => {
        return null
      })
      if (!res) {
        res = await oss?.multipartUploadFiles(file, name, options).catch((e) => {
          setLoading?.(STATE.LOADED)
          throw e
        })
      }
      console.log('oss multipartUpload res:', res)
      setLoading?.(STATE.LOADED)
      return res
    },
    [oss, setLoading]
  )

  return {
    oss,
    loading,
    uploadFiles,
    multipartUploadFiles,
  }
}
