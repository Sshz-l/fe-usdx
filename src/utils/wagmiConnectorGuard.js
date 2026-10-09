const CONNECTOR_METHOD_RE = /getChainId|getProvider|getAccounts/
const WAGMI_STACK_RE = /@wagmi|\/wagmi\/|\/viem\/|\/connectors\//

/** connector 反序列化损坏时的典型错误（局部 wagmi 调用 catch 使用） */
const isBrokenConnectorError = (message) =>
  !!message && CONNECTOR_METHOD_RE.test(message) && message.includes('is not a function')

/**
 * 全局 error / unhandledrejection 兜底：在 isBrokenConnectorError 基础上，
 * 仅当 stack 指向 wagmi/viem/connector 时才接受「含 connector 方法名」的其它报错。
 */
const isBrokenConnectorGlobalError = (message, stack) => {
  if (isBrokenConnectorError(message)) return true
  if (!message || !stack || !WAGMI_STACK_RE.test(stack)) return false
  return CONNECTOR_METHOD_RE.test(message)
}

module.exports = {
  isBrokenConnectorError,
  isBrokenConnectorGlobalError,
}
