export const CHAINS = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpc: process.env.RPC_ETHEREUM!,
    protocols: {
      aave: {
        pool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" // Aave v2 Pool
      },
      compound: {
        comptroller: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B" // Comptroller v2
      }
    }
  },
  bnb: {
    name: "BNB Chain",
    chainId: 56,
    rpc: process.env.RPC_BNB!,
    protocols: {
      venus: {
        comptroller: "0xfD36E2c2a6789Db23113685031d7F16329158384"
      }
    }
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.RPC_POLYGON!,
    protocols: {
      aave: {
        pool: "0x8dFF5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf" // Aave v2 Polygon
      }
    }
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM!,
    protocols: {
      aave: {
        pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" // Aave v3 Arbitrum
      }
    }
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM!,
    protocols: {
      aave: {
        pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" // Aave v3 Optimism
      }
    }
  },
  avalanche: {
    name: "Avalanche",
    chainId: 43114,
    rpc: process.env.RPC_AVALANCHE!,
    protocols: {
      benqi: {
        comptroller: "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4"
      },
      aave: {
        pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" // Aave v3 Avalanche
      }
    }
  },
  fantom: {
    name: "Fantom",
    chainId: 250,
    rpc: process.env.RPC_FANTOM!,
    protocols: {
      aave: {
        pool: "0x6F634c6135D2EbCda8b9F6dA02f63A7dFeE7558F" // Aave v3 Fantom
      }
    }
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.RPC_BASE!,
    protocols: {
      aave: {
        pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" // Aave v3 Base
      }
    }
  },
  zksync: {
    name: "zkSync Era",
    chainId: 324,
    rpc: process.env.RPC_ZKSYNC!,
    protocols: {
      aave: {
        pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" // placeholder if deployed
      }
    }
  },
  moonbeam: {
    name: "Moonbeam",
    chainId: 1284,
    rpc: process.env.RPC_MOONBEAM!,
    protocols: {
      moonwell: {
        comptroller: "0x2E7222e51c0f6e98610A1543Aa3836E092CDe62c"
      }
    }
  }
};