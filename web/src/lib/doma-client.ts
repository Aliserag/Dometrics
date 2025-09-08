/**
 * Doma API client for Lock & Lend Analytics
 * Handles Subgraph, Poll API, Orderbook API, and Smart Contract interactions
 */

import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, parseAbi } from 'viem'
import { defineChain } from 'viem'

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

// Environment configuration
const config = {
  subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api-testnet.doma.xyz/graphql',
  rpcUrl: process.env.NEXT_PUBLIC_DOMA_RPC || 'https://rpc-testnet.doma.xyz',
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER || 'https://explorer-testnet.doma.xyz',
  apiKey: process.env.DOMA_API_KEY, // Server-side only
  pollApiUrl: 'https://api-testnet.doma.xyz/v1/poll',
  orderbookApiUrl: 'https://api-testnet.doma.xyz/v1/orderbook'
} as const

// GraphQL client for Subgraph queries
export const subgraphClient = new GraphQLClient(config.subgraphUrl, {
  headers: config.apiKey ? { 'Api-Key': config.apiKey } : {}
})

// Viem client for contract interactions
export const publicClient = createPublicClient({
  chain: domaTestnet,
  transport: http()
})

// Ownership Token contract ABI (minimal for risk checks)
export const ownershipTokenAbi = parseAbi([
  'function expirationOf(uint256 tokenId) view returns (uint256)',
  'function lockStatusOf(uint256 tokenId) view returns (bool)',
  'function registrarOf(uint256 tokenId) view returns (uint256)',
  'event OwnershipTokenMinted(uint256 indexed tokenId, address indexed to)',
  'event NameTokenRenewed(uint256 indexed tokenId, uint256 expiresAt)',
  'event NameTokenBurned(uint256 indexed tokenId)',
  'event LockStatusChanged(uint256 indexed tokenId, bool locked)',
  'event MetadataUpdate(uint256 indexed tokenId)'
])

// TypeScript interfaces for API responses
export interface NameModel {
  name: string
  tld: string
  tokens: {
    items: TokenModel[]
  }
}

export interface TokenModel {
  tokenId: string
  tokenAddress: string
  expiresAt: string // ISO date string
  explorerUrl: string
  ownerAddress: string
}

export interface NameStatisticsModel {
  tokenId: string
  offersCount: number
  listingsCount: number
  lastActivityAt: string
}

export interface TokenActivity {
  type: 'MINTED' | 'LISTED' | 'OFFER_RECEIVED' | 'RENEWED' | 'PURCHASED' | 'TRANSFERRED' | 'BURNED'
  txHash: string
  createdAt: string
  finalized: boolean
}

export interface PollEvent {
  id: string
  type: string
  tokenId?: string
  blockNumber: number
  txHash: string
  timestamp: string
  data: Record<string, any>
}

// Subgraph Queries
export const QUERIES = {
  // Get domains owned by specific addresses
  MY_NAMES: `
    query MyNames($owners: [AddressCAIP10!]!, $take: Int = 25) {
      names(ownedBy: $owners, claimStatus: ALL, take: $take) {
        items {
          name
          tld
          tokens {
            items {
              tokenId
              tokenAddress
              expiresAt
              explorerUrl
              ownerAddress
            }
          }
        }
      }
    }
  `,

  // Get activities for a specific token
  TOKEN_ACTIVITIES: `
    query TokenActivities($tokenId: String!, $take: Int = 20) {
      tokenActivities(tokenId: $tokenId, take: $take, sortOrder: DESC) {
        items {
          type
          txHash
          createdAt
          finalized
        }
      }
    }
  `,

  // Get domain statistics
  NAME_STATISTICS: `
    query NameStatistics($tokenId: String!) {
      nameStatistics(tokenId: $tokenId) {
        tokenId
        offersCount
        listingsCount
        lastActivityAt
      }
    }
  `,

  // Get current listings and offers
  MARKET_DATA: `
    query MarketData($tld: String, $take: Int = 100) {
      listings(tld: $tld, take: $take, sortOrder: DESC) {
        items {
          orderId
          tokenId
          price
          currency
          createdAt
          expiresAt
        }
      }
      offers(tld: $tld, take: $take, sortOrder: DESC) {
        items {
          orderId
          tokenId
          price
          currency
          createdAt
          expiresAt
        }
      }
    }
  `
}

// Doma API client class
export class DomaClient {
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }

  // Subgraph queries
  async getNamesByOwner(owners: string[], take = 25): Promise<NameModel[]> {
    const response = await subgraphClient.request<{ names: { items: NameModel[] } }>(
      QUERIES.MY_NAMES,
      { owners, take }
    )
    return response.names.items
  }

  async getTokenActivities(tokenId: string, take = 20): Promise<TokenActivity[]> {
    const response = await subgraphClient.request<{ tokenActivities: { items: TokenActivity[] } }>(
      QUERIES.TOKEN_ACTIVITIES,
      { tokenId, take }
    )
    return response.tokenActivities.items
  }

  async getNameStatistics(tokenId: string): Promise<NameStatisticsModel> {
    const response = await subgraphClient.request<{ nameStatistics: NameStatisticsModel }>(
      QUERIES.NAME_STATISTICS,
      { tokenId }
    )
    return response.nameStatistics
  }

  // Smart contract reads (batched)
  async getTokenRiskData(tokenAddress: string, tokenIds: string[]) {
    const multicalls = tokenIds.flatMap(tokenId => [
      {
        address: tokenAddress as `0x${string}`,
        abi: ownershipTokenAbi,
        functionName: 'expirationOf',
        args: [BigInt(tokenId)]
      },
      {
        address: tokenAddress as `0x${string}`,
        abi: ownershipTokenAbi,
        functionName: 'lockStatusOf',
        args: [BigInt(tokenId)]
      },
      {
        address: tokenAddress as `0x${string}`,
        abi: ownershipTokenAbi,
        functionName: 'registrarOf',
        args: [BigInt(tokenId)]
      }
    ])

    const results = await publicClient.multicall({ contracts: multicalls })
    
    // Group results by tokenId
    const riskData: Record<string, {
      expirationOf: bigint
      lockStatusOf: boolean
      registrarOf: bigint
    }> = {}

    tokenIds.forEach((tokenId, index) => {
      const baseIndex = index * 3
      riskData[tokenId] = {
        expirationOf: results[baseIndex].result as bigint,
        lockStatusOf: results[baseIndex + 1].result as boolean,
        registrarOf: results[baseIndex + 2].result as bigint
      }
    })

    return riskData
  }

  // Poll API for real-time events (server-side only)
  async pollEvents(lastEventId?: string, eventTypes?: string[], limit = 100): Promise<{
    events: PollEvent[]
    lastEventId: string
  }> {
    if (!this.apiKey) {
      throw new Error('API key required for Poll API')
    }

    const url = new URL(config.pollApiUrl)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('finalizedOnly', 'true')
    
    if (lastEventId) {
      url.searchParams.set('lastEventId', lastEventId)
    }
    
    if (eventTypes) {
      eventTypes.forEach(type => url.searchParams.append('eventTypes', type))
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Api-Key': this.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Poll API error: ${response.statusText}`)
    }

    return response.json()
  }

  // Acknowledge processed events
  async ackEvents(lastEventId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('API key required for Poll API')
    }

    const response = await fetch(`${config.pollApiUrl}/ack/${lastEventId}`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Poll API ack error: ${response.statusText}`)
    }
  }

  // Utility functions
  static formatExplorerUrl(txHash: string): string {
    return `${config.explorerUrl}/tx/${txHash}`
  }

  static formatTokenUrl(tokenAddress: string, tokenId: string): string {
    return `${config.explorerUrl}/token/${tokenAddress}?tokenId=${tokenId}`
  }

  static isExpiringSoon(expirationTimestamp: bigint, bufferDays = 30): boolean {
    const now = Math.floor(Date.now() / 1000)
    const buffer = bufferDays * 24 * 60 * 60
    return Number(expirationTimestamp) - now < buffer
  }

  static calculateExpiryBuffer(expirationTimestamp: bigint): number {
    const now = Math.floor(Date.now() / 1000)
    const secondsUntilExpiry = Number(expirationTimestamp) - now
    return Math.floor(secondsUntilExpiry / (24 * 60 * 60)) // Convert to days
  }
}

// Create default client instance
export const domaClient = new DomaClient(config.apiKey)