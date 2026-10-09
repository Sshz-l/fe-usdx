import { toast, type ToastOptions } from 'react-toastify'

/** USDX H5 专用 toast 容器（底部居中，对齐设计稿 #toastHost + .toast） */
export const USDX_TOAST_CONTAINER = 'usdx-toast'

/** 设计稿 showToast 默认 2600ms */
export const USDX_TOAST_DURATION_MS = 2600

export const usdxToastOptions = (overrides?: ToastOptions): ToastOptions => ({
  containerId: USDX_TOAST_CONTAINER,
  icon: false,
  autoClose: USDX_TOAST_DURATION_MS,
  hideProgressBar: true,
  closeButton: false,
  pauseOnFocusLoss: false,
  draggable: false,
  ...overrides,
})

export const showUsdxToast = (message: string, overrides?: ToastOptions) =>
  toast(message, usdxToastOptions(overrides))

export const showUsdxToastSuccess = (message: string, overrides?: ToastOptions) =>
  toast.success(message, usdxToastOptions(overrides))

export const showUsdxToastError = (message: string, overrides?: ToastOptions) =>
  toast.error(message, usdxToastOptions({ autoClose: 4000, ...overrides }))

/** 子页先回主页再展示成功 toast，对齐 HTML doRedeem/doMint 顺序，避免路由切换时浮层闪退 */
export const showUsdxToastSuccessAfterNav = (message: string, overrides?: ToastOptions) => {
  window.requestAnimationFrame(() => {
    showUsdxToastSuccess(message, overrides)
  })
}
