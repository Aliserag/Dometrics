'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'
import { defineChain } from 'viem'
import { useState } from 'react'

// Doma testnet chain configuration
export const domaTestnet = defineChain({
  id: 97476,
  name: 'Doma Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.doma.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Doma Explorer', url: 'https://explorer-testnet.doma.xyz' }
  },
  testnet: true
})

// Web3Modal project ID (you should get your own from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'YOUR_PROJECT_ID'

// Wagmi config
const config = createConfig({
  chains: [domaTestnet, baseSepolia],
  transports: {
    [domaTestnet.id]: http('https://rpc-testnet.doma.xyz'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  connectors: [
    walletConnect({ projectId }),
    injected(),
    coinbaseWallet({
      appName: 'Dometrics',
      appLogoUrl: 'https://dometrics.vercel.app/logo.png',
    }),
  ],
})

// Create Web3Modal instance
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  enableOnramp: false,
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '12px',
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 5 * 60 * 1000, // 5 minutes
      },
    },
  }))

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}