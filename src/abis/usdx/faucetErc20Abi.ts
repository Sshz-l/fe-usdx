/** FaucetERC20（BSC TEST tUSDT / tBox） */
export const faucetErc20Abi = [
  {
    type: 'function',
    name: 'claim',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const
