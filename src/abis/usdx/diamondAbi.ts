/** Diamond Protocol + Stabilizer facets（对齐 debox-tech-wiki abi/usdxAbi.ts；已剔除 admin/init） */
import { usdxStabilizerAbi } from './stabilizerAbi'

const usdxDiamondCoreAbi = [
  {
    "name": "activitiesOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      },
      {
        "type": "uint256",
        "name": "offset"
      },
      {
        "type": "uint256",
        "name": "limit"
      }
    ],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "list",
        "components": [
          {
            "type": "uint8",
            "name": "kind"
          },
          {
            "type": "uint8",
            "name": "extra"
          },
          {
            "type": "uint64",
            "name": "ts"
          },
          {
            "type": "uint64",
            "name": "mintId"
          },
          {
            "type": "uint128",
            "name": "a0"
          },
          {
            "type": "uint128",
            "name": "a1"
          },
          {
            "type": "uint128",
            "name": "a2"
          }
        ]
      },
      {
        "type": "uint256",
        "name": "total"
      }
    ]
  },
  {
    "name": "activityCount",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "claimableOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "mintId"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "econParams",
    "type": "function",
    "stateMutability": "pure",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint16",
            "name": "treasuryBps"
          },
          {
            "type": "uint16",
            "name": "lpBps"
          },
          {
            "type": "uint16",
            "name": "sideBps"
          }
        ]
      }
    ]
  },
  {
    "name": "mintWithMinLpLiquidity",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "usdtIn"
      },
      {
        "type": "uint256",
        "name": "maxBoxIn"
      },
      {
        "type": "uint128",
        "name": "minLpLiquidity"
      },
      {
        "type": "tuple",
        "name": "permit",
        "components": [
          {
            "type": "tuple[]",
            "name": "permitted",
            "components": [
              {
                "type": "address",
                "name": "token"
              },
              {
                "type": "uint256",
                "name": "amount"
              }
            ]
          },
          {
            "type": "uint256",
            "name": "nonce"
          },
          {
            "type": "uint256",
            "name": "deadline"
          }
        ]
      },
      {
        "type": "bytes",
        "name": "signature"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "mintId"
      },
      {
        "type": "uint256",
        "name": "boxIn"
      },
      {
        "type": "uint256",
        "name": "immediate"
      }
    ]
  },
  {
    "name": "mintIdsOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]"
      }
    ]
  },
  {
    "name": "mintOwner",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "mintId"
      }
    ],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "positionOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "mintId"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "name": "v",
        "components": [
          {
            "type": "uint256",
            "name": "mintId"
          },
          {
            "type": "uint256",
            "name": "totalUSDX"
          },
          {
            "type": "uint256",
            "name": "payUSDT"
          },
          {
            "type": "uint256",
            "name": "payBOX"
          },
          {
            "type": "uint256",
            "name": "immediate"
          },
          {
            "type": "uint256",
            "name": "startTs"
          },
          {
            "type": "uint256",
            "name": "claimed"
          },
          {
            "type": "uint256",
            "name": "lockL0"
          },
          {
            "type": "uint256",
            "name": "elapsed"
          },
          {
            "type": "uint256",
            "name": "vested"
          },
          {
            "type": "uint256",
            "name": "claimableAmount"
          },
          {
            "type": "uint256",
            "name": "remainingLock"
          },
          {
            "type": "uint256",
            "name": "daily"
          }
        ]
      }
    ]
  },
  {
    "name": "positionsOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      },
      {
        "type": "uint256",
        "name": "offset"
      },
      {
        "type": "uint256",
        "name": "limit"
      }
    ],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "list",
        "components": [
          {
            "type": "uint256",
            "name": "mintId"
          },
          {
            "type": "uint256",
            "name": "totalUSDX"
          },
          {
            "type": "uint256",
            "name": "payUSDT"
          },
          {
            "type": "uint256",
            "name": "payBOX"
          },
          {
            "type": "uint256",
            "name": "immediate"
          },
          {
            "type": "uint256",
            "name": "startTs"
          },
          {
            "type": "uint256",
            "name": "claimed"
          },
          {
            "type": "uint256",
            "name": "lockL0"
          },
          {
            "type": "uint256",
            "name": "elapsed"
          },
          {
            "type": "uint256",
            "name": "vested"
          },
          {
            "type": "uint256",
            "name": "claimableAmount"
          },
          {
            "type": "uint256",
            "name": "remainingLock"
          },
          {
            "type": "uint256",
            "name": "daily"
          }
        ]
      },
      {
        "type": "uint256",
        "name": "total"
      }
    ]
  },
  {
    "name": "positionsOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "list",
        "components": [
          {
            "type": "uint256",
            "name": "mintId"
          },
          {
            "type": "uint256",
            "name": "totalUSDX"
          },
          {
            "type": "uint256",
            "name": "payUSDT"
          },
          {
            "type": "uint256",
            "name": "payBOX"
          },
          {
            "type": "uint256",
            "name": "immediate"
          },
          {
            "type": "uint256",
            "name": "startTs"
          },
          {
            "type": "uint256",
            "name": "claimed"
          },
          {
            "type": "uint256",
            "name": "lockL0"
          },
          {
            "type": "uint256",
            "name": "elapsed"
          },
          {
            "type": "uint256",
            "name": "vested"
          },
          {
            "type": "uint256",
            "name": "claimableAmount"
          },
          {
            "type": "uint256",
            "name": "remainingLock"
          },
          {
            "type": "uint256",
            "name": "daily"
          }
        ]
      }
    ]
  },
  {
    "name": "protocolConfig",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "name": "c",
        "components": [
          {
            "type": "address",
            "name": "usdx"
          },
          {
            "type": "address",
            "name": "usdt"
          },
          {
            "type": "address",
            "name": "box"
          },
          {
            "type": "address",
            "name": "oracle"
          },
          {
            "type": "address",
            "name": "locker"
          },
          {
            "type": "address",
            "name": "treasury"
          },
          {
            "type": "address",
            "name": "marketing"
          },
          {
            "type": "address",
            "name": "shares"
          },
          {
            "type": "address",
            "name": "boxBurnSink"
          },
          {
            "type": "address",
            "name": "feeTo"
          },
          {
            "type": "bool",
            "name": "pauseMint"
          },
          {
            "type": "bool",
            "name": "pauseRelease"
          },
          {
            "type": "bool",
            "name": "pauseRedeem"
          },
          {
            "type": "uint256",
            "name": "minDepositValue"
          },
          {
            "type": "uint256",
            "name": "daySeconds"
          }
        ]
      }
    ]
  },
  {
    "name": "protocolState",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "name": "s",
        "components": [
          {
            "type": "uint256",
            "name": "Etotal"
          },
          {
            "type": "uint256",
            "name": "nextMintId"
          },
          {
            "type": "uint256",
            "name": "treasuryU"
          },
          {
            "type": "uint256",
            "name": "treasuryB"
          }
        ]
      }
    ]
  },
  {
    "name": "protocolView",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "name": "v",
        "components": [
          {
            "type": "uint256",
            "name": "U"
          },
          {
            "type": "uint256",
            "name": "B"
          },
          {
            "type": "uint256",
            "name": "P"
          },
          {
            "type": "uint256",
            "name": "Sr"
          },
          {
            "type": "uint256",
            "name": "Etotal"
          },
          {
            "type": "uint256",
            "name": "T"
          },
          {
            "type": "uint8",
            "name": "mode"
          }
        ]
      }
    ]
  },
  {
    "name": "quoteMint",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "usdtIn"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "boxIn"
      },
      {
        "type": "uint256",
        "name": "depositD"
      },
      {
        "type": "uint256",
        "name": "immediate"
      },
      {
        "type": "uint256",
        "name": "lockL0"
      },
      {
        "type": "uint256",
        "name": "daily"
      },
      {
        "type": "bool",
        "name": "mintable"
      }
    ]
  },
  {
    "name": "quoteMinLpLiquidity",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "usdtIn"
      }
    ],
    "outputs": [
      {
        "type": "uint128",
        "name": "minLpLiquidity"
      }
    ]
  },
  {
    "name": "quoteRedeem",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "usdxAmount"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint8",
            "name": "mode"
          },
          {
            "type": "uint256",
            "name": "usdtOut"
          },
          {
            "type": "uint256",
            "name": "boxOut"
          },
          {
            "type": "uint256",
            "name": "feeUsdt"
          },
          {
            "type": "uint256",
            "name": "feeBox"
          },
          {
            "type": "uint256",
            "name": "dWad"
          },
          {
            "type": "bool",
            "name": "valueAvailable"
          }
        ]
      }
    ]
  },
  {
    "name": "redeem",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "usdxAmount"
      },
      {
        "type": "tuple",
        "name": "sig",
        "components": [
          {
            "type": "uint256",
            "name": "deadline"
          },
          {
            "type": "uint8",
            "name": "v"
          },
          {
            "type": "bytes32",
            "name": "r"
          },
          {
            "type": "bytes32",
            "name": "s"
          }
        ]
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "usdtOut"
      },
      {
        "type": "uint256",
        "name": "boxOut"
      },
      {
        "type": "uint8",
        "name": "mode"
      }
    ]
  },
  {
    "name": "redeemWithAllowance",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "usdxAmount"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "usdtOut"
      },
      {
        "type": "uint256",
        "name": "boxOut"
      },
      {
        "type": "uint8",
        "name": "mode"
      }
    ]
  },
  {
    "name": "release",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "mintId"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "amount"
      }
    ]
  },
  {
    "name": "releaseAll",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": "total"
      }
    ]
  },
  {
    "name": "releaseMany",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256[]",
        "name": "mintIds"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "total"
      }
    ]
  },
  {
    "name": "userUsdxView",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      },
      {
        "type": "uint256",
        "name": "offset"
      },
      {
        "type": "uint256",
        "name": "limit"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "name": "v",
        "components": [
          {
            "type": "uint256",
            "name": "wallet"
          },
          {
            "type": "uint256",
            "name": "claimable"
          },
          {
            "type": "uint256",
            "name": "remainingLock"
          },
          {
            "type": "uint256",
            "name": "unminted"
          },
          {
            "type": "uint256",
            "name": "total"
          },
          {
            "type": "uint256",
            "name": "positionCount"
          }
        ]
      }
    ]
  },
  {
    "name": "userUsdxView",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "name": "v",
        "components": [
          {
            "type": "uint256",
            "name": "wallet"
          },
          {
            "type": "uint256",
            "name": "claimable"
          },
          {
            "type": "uint256",
            "name": "remainingLock"
          },
          {
            "type": "uint256",
            "name": "unminted"
          },
          {
            "type": "uint256",
            "name": "total"
          },
          {
            "type": "uint256",
            "name": "positionCount"
          }
        ]
      }
    ]
  },
  {
    "name": "MinLpLiquidityNotMet",
    "type": "error",
    "inputs": [
      {
        "type": "uint128",
        "name": "actual"
      },
      {
        "type": "uint128",
        "name": "minimum"
      }
    ]
  }
] as const

export const usdxDiamondAbi = [...usdxDiamondCoreAbi, ...usdxStabilizerAbi] as const

/** @deprecated 使用 usdxDiamondAbi */
export const usdxDiamondViewsAbi = usdxDiamondAbi
