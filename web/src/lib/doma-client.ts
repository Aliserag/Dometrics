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
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 0,
    },
  },
  testnet: true
})

// Environment configuration
const config = {
  subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api-testnet.doma.xyz/graphql',
  rpcUrl: process.env.NEXT_PUBLIC_DOMA_RPC || 'https://rpc-testnet.doma.xyz',
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER || 'https://explorer-testnet.doma.xyz',
  apiKey: process.env.NEXT_PUBLIC_DOMA_API_KEY || process.env.DOMA_API_KEY,
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
export interface TokenModel {
  tokenId: string
  tokenAddress: string
  ownerAddress: string
  expiresAt: string
  explorerUrl: string
}

export interface RegistrarModel {
  name: string
  ianaId?: string
  publicKeys?: string[]
  websiteUrl?: string
  supportEmail?: string
}

export interface NameModel {
  name: string
  expiresAt: string
  tokenizedAt?: string
  eoi?: string
  registrar?: RegistrarModel
  transferLock?: boolean
  claimedBy?: string
  tokens: TokenModel[]
}

export interface DomainModel {
  name: string
  tld: string
  tokenId: string
  tokenAddress: string
  expiresAt: string // ISO date string
  explorerUrl: string
  ownerAddress: string
}

export interface NameStatisticsModel {
  name: string
  activeOffers: number
  offersLast3Days: number
  highestOffer: {
    id: string
    externalId: string
    price: string
    offererAddress: string
    orderbook: string
    currency: {
      name: string
      symbol: string
      decimals: number
      usdExchangeRate: number
    }
    expiresAt: string
    createdAt: string
  } | null
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
  // Get all names with their tokens
  MY_NAMES: `
    query MyNames($take: Int = 25) {
      names(take: $take) {
        items {
          name
          expiresAt
          tokenizedAt
          registrar {
            name
            ianaId
          }
          transferLock
          claimedBy
          tokens {
            tokenId
            tokenAddress
            ownerAddress
            expiresAt
            explorerUrl
          }
        }
      }
    }
  `,
  
  // Get names by owner
  NAMES_BY_OWNER: `
    query NamesByOwner($owners: [AddressCAIP10!]!, $take: Int = 25) {
      names(ownedBy: $owners, take: $take) {
        items {
          name
          expiresAt
          tokenizedAt
          registrar {
            name
            ianaId
          }
          transferLock
          claimedBy
          tokens {
            tokenId
            tokenAddress
            ownerAddress
            expiresAt
            explorerUrl
          }
        }
      }
    }
  `,

  // Get activities for a specific token with proper union fragments
  TOKEN_ACTIVITIES: `
    query TokenActivities($tokenId: String, $take: Int = 50) {
      tokenActivities(tokenId: $tokenId, take: $take) {
        items {
          ... on TokenMintedActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            networkId
          }
          ... on TokenTransferredActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            transferredTo
            transferredFrom
          }
          ... on TokenListedActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            orderId
            seller
            buyer
            payment {
              price
              tokenAddress
              currencySymbol
            }
            orderbook
            expiresAt
          }
          ... on TokenOfferReceivedActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            orderId
            buyer
            seller
            payment {
              price
              tokenAddress
              currencySymbol
            }
            orderbook
            expiresAt
          }
          ... on TokenPurchasedActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            seller
            buyer
            payment {
              price
              tokenAddress
              currencySymbol
            }
          }
          ... on TokenOfferCancelledActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            orderId
          }
          ... on TokenListingCancelledActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
            orderId
          }
          ... on TokenFractionalizedActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
          }
          ... on TokenBoughtOutActivity {
            type
            txHash
            createdAt
            finalized
            tokenId
            name
          }
        }
      }
    }
  `,

  // Get domain statistics
  NAME_STATISTICS: `
    query NameStatistics($tokenId: String!) {
      nameStatistics(tokenId: $tokenId) {
        name
        activeOffers
        offersLast3Days
        highestOffer {
          id
          externalId
          price
          offererAddress
          orderbook
          currency {
            name
            symbol
            decimals
            usdExchangeRate
          }
          expiresAt
          createdAt
        }
      }
    }
  `,

  // Get current offers for a token (tokenId is optional)
  TOKEN_OFFERS: `
    query TokenOffers($tokenId: String, $take: Int = 20) {
      offers(tokenId: $tokenId, take: $take) {
        items {
          id
          externalId
          price
          offererAddress
          orderbook
          currency {
            name
            symbol
            decimals
            usdExchangeRate
          }
          expiresAt
          createdAt
          tokenId
        }
      }
    }
  `,

  // Get current listings (no tokenId parameter supported - must filter client-side)
  TOKEN_LISTINGS: `
    query TokenListings($take: Int = 20, $tlds: [String!], $sld: String) {
      listings(take: $take, tlds: $tlds, sld: $sld) {
        items {
          id
          externalId
          tokenId
          price
          offererAddress
          orderbook
          currency {
            name
            symbol
            decimals
            usdExchangeRate
          }
          expiresAt
          createdAt
          name
          nameExpiresAt
          tokenAddress
        }
      }
    }
  `,

  // Get all listings (marketplace overview)
  ALL_LISTINGS: `
    query AllListings($take: Int = 100) {
      listings(take: $take) {
        items {
          id
          tokenId
          price
          sellerAddress
          currency {
            symbol
            decimals
            usdExchangeRate
          }
          createdAt
        }
      }
    }
  `,

  // Get chain statistics
  CHAIN_STATISTICS: `
    query ChainStatistics {
      chainStatistics {
        totalActiveWallets
        totalTransactions
        totalNamesTokenized
        totalRevenueUsd
      }
    }
  `,

  // Old market data query for backwards compatibility
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

  // Get all names from testnet
  async getAllNames(take = 25): Promise<NameModel[]> {
    try {
      const response = await subgraphClient.request<{ names: { items: NameModel[] } }>(
        QUERIES.MY_NAMES,
        { take }
      )
      return response.names?.items || []
    } catch (error) {
      console.error('Error fetching names:', error)
      return []
    }
  }

  // Get names by owner
  async getNamesByOwner(owners: string[], take = 25): Promise<NameModel[]> {
    try {
      // Convert to CAIP10 format if needed
      const caip10Owners = owners.map(addr => {
        if (addr.startsWith('eip155:')) return addr
        return `eip155:97476:${addr}`
      })
      
      const response = await subgraphClient.request<{ names: { items: NameModel[] } }>(
        QUERIES.NAMES_BY_OWNER,
        { owners: caip10Owners, take }
      )
      return response.names?.items || []
    } catch (error) {
      console.error('Error fetching domains by owner:', error)
      // Fall back to getting all names
      return this.getAllNames(take)
    }
  }

  async getTokenActivities(tokenId: string, take = 20): Promise<TokenActivity[]> {
    try {
      const response = await subgraphClient.request<{ tokenActivities: { items: TokenActivity[] } }>(
        QUERIES.TOKEN_ACTIVITIES,
        { tokenId, take }
      )
      return response.tokenActivities?.items || []
    } catch (error) {
      // If tokenActivities query fails, return empty array
      console.warn('TokenActivities query failed, returning empty array')
      return []
    }
  }

  async getNameStatistics(tokenId: string): Promise<NameStatisticsModel | null> {
    try {
      const response = await subgraphClient.request<{ nameStatistics: NameStatisticsModel }>(
        QUERIES.NAME_STATISTICS,
        { tokenId }
      )
      return response.nameStatistics
    } catch (error) {
      // nameStatistics query not available - return null
      // Most marketplace queries are not available in current API version
      return null
    }
  }

  // Get active offers for a token
  async getTokenOffers(tokenId: string, take = 20): Promise<any[]> {
    try {
      const response = await subgraphClient.request<{ offers: { items: any[] } }>(
        QUERIES.TOKEN_OFFERS,
        { tokenId, take }
      )
      return response.offers?.items || []
    } catch (error) {
      console.error('Error fetching offers:', error)
      return []
    }
  }

  // Get active listings for a token
  // Note: API doesn't support tokenId filter, so we fetch all and filter client-side
  async getTokenListings(tokenId: string, take = 100): Promise<any[]> {
    try {
      const response = await subgraphClient.request<{ listings: { items: any[] } }>(
        QUERIES.TOKEN_LISTINGS,
        { take }
      )
      const allListings = response.listings?.items || []
      // Filter by tokenId client-side
      return allListings.filter(listing => listing.tokenId === tokenId)
    } catch (error) {
      console.error('Error fetching listings:', error)
      return []
    }
  }

  // Get all marketplace listings
  async getAllListings(take = 100): Promise<any[]> {
    try {
      const response = await subgraphClient.request<{ listings: { items: any[] } }>(
        QUERIES.ALL_LISTINGS,
        { take }
      )
      return response.listings?.items || []
    } catch (error) {
      console.error('Error fetching all listings:', error)
      return []
    }
  }

  // Get chain statistics
  async getChainStatistics(): Promise<any> {
    try {
      const response = await subgraphClient.request<{ chainStatistics: any }>(
        QUERIES.CHAIN_STATISTICS
      )
      return response.chainStatistics
    } catch (error) {
      console.error('Error fetching chain statistics:', error)
      return null
    }
  }


  // Smart contract reads (batched)
  async getTokenRiskData(tokenAddress: string, tokenIds: string[]) {
    const riskData: Record<string, {
      expirationOf: bigint
      lockStatusOf: boolean
      registrarOf: bigint
    }> = {}

    try {
      // Try multicall first (more efficient)
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
      tokenIds.forEach((tokenId, index) => {
        const baseIndex = index * 3
        riskData[tokenId] = {
          expirationOf: results[baseIndex].result as bigint,
          lockStatusOf: results[baseIndex + 1].result as boolean,
          registrarOf: results[baseIndex + 2].result as bigint
        }
      })
    } catch (error) {
      // Fallback to individual calls if multicall not supported
      console.warn('Multicall not supported, using individual contract calls')

      for (const tokenId of tokenIds) {
        try {
          const [expirationOf, lockStatusOf, registrarOf] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ownershipTokenAbi,
              functionName: 'expirationOf',
              args: [BigInt(tokenId)]
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ownershipTokenAbi,
              functionName: 'lockStatusOf',
              args: [BigInt(tokenId)]
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ownershipTokenAbi,
              functionName: 'registrarOf',
              args: [BigInt(tokenId)]
            })
          ])

          riskData[tokenId] = {
            expirationOf: expirationOf as bigint,
            lockStatusOf: lockStatusOf as boolean,
            registrarOf: registrarOf as bigint
          }
        } catch (err) {
          console.error(`Failed to fetch contract data for token ${tokenId}:`, err)
        }
      }
    }

    return riskData
  }

  // Calculate real market value from marketplace data
  async getRealMarketValue(tokenId: string): Promise<{ currentValue: number; source: string; confidence: number } | null> {
    try {
      // 1. Try to get recent sale price (most accurate)
      const activities = await this.getTokenActivities(tokenId, 20)
      const recentSales = activities.filter((a: any) => a.type === 'PURCHASED' && a.payment?.price)
      if (recentSales.length > 0) {
        const latestSale = recentSales[0] as any
        const price = parseFloat(latestSale.payment.price)
        return {
          currentValue: Math.round(price),
          source: 'recent_sale',
          confidence: 95
        }
      }

      // 2. Try nameStatistics for highest offer
      const stats = await this.getNameStatistics(tokenId)
      if (stats?.highestOffer) {
        const price = parseFloat(stats.highestOffer.price)
        const usdPrice = stats.highestOffer.currency.usdExchangeRate
          ? price * stats.highestOffer.currency.usdExchangeRate
          : price
        return {
          currentValue: Math.round(usdPrice),
          source: 'highest_offer',
          confidence: 85
        }
      }

      // 3. Fallback to offers query
      const offers = await this.getTokenOffers(tokenId, 20)
      if (offers.length > 0) {
        const prices = offers.map((o: any) => {
          const price = parseFloat(o.price)
          return o.currency?.usdExchangeRate ? price * o.currency.usdExchangeRate : price
        })
        const maxOffer = Math.max(...prices)
        return {
          currentValue: Math.round(maxOffer),
          source: 'offer',
          confidence: 75
        }
      }

      // 4. Try listings (seller asking price)
      const listings = await this.getTokenListings(tokenId)
      if (listings.length > 0) {
        const prices = listings.map((l: any) => {
          const price = parseFloat(l.price)
          return l.currency?.usdExchangeRate ? price * l.currency.usdExchangeRate : price
        })
        const minListing = Math.min(...prices)
        return {
          currentValue: Math.round(minListing),
          source: 'listing',
          confidence: 65
        }
      }

      return null
    } catch (error) {
      console.error('Error calculating real market value:', error)
      return null
    }
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