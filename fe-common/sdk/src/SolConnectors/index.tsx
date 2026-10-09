import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  SolflareWalletAdapter,
  PhantomWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import getConfig from 'next/config';
import { clusterApiUrl, Connection } from '@solana/web3.js';

const { publicRuntimeConfig } = getConfig();

const CustomConnectionProvider = ({ endpoint, fallbackEndpoint, children, headers }: any) => {
  const [currentEndpoint, setCurrentEndpoint] = useState(endpoint);
  
  // 修复备用节点 调不通的情况
  useEffect(() => {
    const checkEndpoint = async () => {
      try {
        const connection = new Connection(currentEndpoint);
        await connection.getEpochInfo(); // 尝试获取 epoch 信息来检测连接是否正常
      } catch (error) {
        console.error('Primary endpoint failed, switching to fallback:', error);
        setCurrentEndpoint(fallbackEndpoint);
      }
    };

    checkEndpoint();
  }, [currentEndpoint, fallbackEndpoint]);

  // 创建带自定义请求头的连接配置
  const connectionConfig = useMemo(() => {
    return {
      commitment: 'confirmed' as const,
      httpHeaders: Object.keys(headers).length > 0 ? headers : undefined,
    };
  }, [headers]);

  return (
    <ConnectionProvider endpoint={currentEndpoint} config={connectionConfig}>
      {children}
    </ConnectionProvider>
  );
};

export const SolanaProvider = ({ children, headers }: any) => {
  const network = WalletAdapterNetwork.Mainnet;
  const primaryEndpoint = useMemo(() => clusterApiUrl(network), [network]);
  const fallbackEndpoint = publicRuntimeConfig.api.solRpc;

  // 如果没有传入headers，则使用默认的认证头
  const authHeaders = useMemo(() => {
    return headers || {};
  }, [headers]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    []
  );

  return (
    <CustomConnectionProvider endpoint={primaryEndpoint} fallbackEndpoint={fallbackEndpoint} headers={authHeaders}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </CustomConnectionProvider>
  );
};