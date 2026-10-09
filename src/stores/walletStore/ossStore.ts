import { observable, action, makeObservable } from 'mobx'
import type OSS from 'ali-oss'

import { postSTSData } from '@/services/stake'
import { STATE } from '@/hooks/useOSS'

export enum TYPES {
  IMG = 'image',
  VIDEO = 'video',
  VOICE = 'voice',
  OTHER = 'other',
}

export class OssStore {
  constructor(type?: 0 | 1 | 2) {
    makeObservable(this)

    this.type = type

    this.init()
  }

  type?: 0 | 1 | 2

  @observable
  ossConfig: any = null

  @observable
  client: OSS | null = null

  @observable
  loading: STATE = STATE.INIT

  @action
  init = async () => {
    await this.getOSSCfg(true)

    const ossConfig = this.ossConfig

    this.client = new window.OSS({
      region: ossConfig?.point,
      accessKeyId: ossConfig?.accessKeyId,
      accessKeySecret: ossConfig?.secretKeyId,
      stsToken: ossConfig?.securityToken,
      bucket: ossConfig?.bucket,
      endpoint: ossConfig?.point,
      secure: true,
      refreshSTSToken: async () => {
        this.loading = STATE.INIT
        const refreshToken: any = await this.getOSSCfg(true)
        this.loading = STATE.LOADED
        return {
          accessKeyId: refreshToken?.accessKeyId,
          accessKeySecret: refreshToken?.secretKeyId,
          stsToken: refreshToken?.securityToken,
        }
      },
      refreshSTSTokenInterval: 1000 * 60 * 25,
    })

    this.loading = STATE.LOADED
  }

  @action
  setLoading = (loading: STATE) => {
    this.loading = loading
  }

  @action
  getOSSCfg = async (refresh?: boolean) => {
    if (refresh === true || !this.ossConfig) {
      this.setLoading(STATE.LOADING)
      const res = await postSTSData(this.type).catch(() => {
        return null
      })
      if (res?.data?.code >= 0 && typeof res?.data?.data === 'object') {
        const newData = res.data.data
        if (Array.isArray(newData?.params)) {
          newData.routesParams = {}
          newData.params.forEach((item: Record<string, string>) => {
            Object.keys(item).forEach((key) => {
              const n = item[key]
              if (n) {
                newData.routesParams[key] = n
              }
            })
          })
        } else {
          newData.routesParams = newData?.params
        }
        this.ossConfig = newData

        return newData
      }

      return null
    } else {
      return this.ossConfig
    }
  }

  put = async (
    file: File,
    name?: string,
    options?: OSS.PutObjectOptions & {
      type?: TYPES
    }
  ) => {
    if (!this.client) {
      throw new Error('client is null')
    }
    const path =
      this.type === 2 && options?.type
        ? this.ossConfig?.routesParams[options.type]
        : this.ossConfig?.route
    const res = await this.client
      ?.put(path + '/' + (name || file.name), file, options)
      .catch((e) => {
        throw e
      })
    return res?.name ? this.ossConfig.ossUrl + '/' + res?.name : ''
  }

  multipartUploadFiles = async (
    file: File,
    name?: string,
    options?: OSS.MultipartUploadOptions & {
      type?: TYPES
    }
  ) => {
    if (!this.client) {
      throw new Error('client is null')
    }
    const path =
      this?.type === 2 && options?.type
        ? this.ossConfig?.routesParams[options.type]
        : this.ossConfig?.route
    const res = await this.client
      ?.multipartUpload(path + '/' + (name || file.name), file, {
        partSize: 1024 * 1024,
        parallel: 5,
        ...options,
      })
      .catch((e) => {
        throw e
      })
    return res?.name ? this.ossConfig.ossUrl + '/' + res?.name : ''
  }
}
