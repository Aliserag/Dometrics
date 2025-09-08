/**
 * Dometrics Scoring Engine
 * Client-side domain scoring with explainable AI
 */

import { TokenModel } from './doma-client'

export interface DomainScores {
  risk: number
  rarity: number
  momentum: number
  forecast: number
  forecastLow: number
  forecastHigh: number
  explainers: {
    risk: ScoreFactor[]
    rarity: ScoreFactor[]
    momentum: ScoreFactor[]
    forecast: ScoreFactor[]
  }
}

export interface ScoreFactor {
  name: string
  value: number
  weight: number
  contribution: number
  description: string
}

export interface ScoringWeights {
  version: string
  riskScore: {
    weights: {
      expiryBuffer: { weight: number; thresholds: { lowRisk: number; highRisk: number } }
      lockStatus: { weight: number; penalties: { locked: number; unlocked: number } }
      registrarQuality: { weight: number; buckets: { trusted: number; unknown: number } }
      renewalHistory: { weight: number; bonus: { threshold: number; reduction: number } }
      liquiditySignals: { weight: number; bonus: { threshold: number; reduction: number } }
    }
  }
  rarityScore: {
    weights: {
      nameLength: { weight: number; thresholds: { maxRarity: number; minRarity: number } }
      dictionaryBrandable: { weight: number; bonuses: { dictionary: number; brandable: number; random: number } }
      tldScarcity: { weight: number; buckets: Record<string, number> }
      historicDemand: { weight: number; baseValue: number }
    }
  }
  momentumScore: {
    weights: {
      activityDelta: { weight: number; periods: { recent: number; baseline: number } }
      recentEvents: { weight: number; timeWindow: number }
    }
  }
  forecastScore: {
    weights: { momentum: number; rarity: number; risk: number }
    confidenceInterval: { base: number; riskMultiplier: number }
  }
}

// Default weights (can be overridden by fetching from /config/weights.v1.json)
const DEFAULT_WEIGHTS: ScoringWeights = {
  version: 'v1',
  riskScore: {
    weights: {
      expiryBuffer: { weight: 0.45, thresholds: { lowRisk: 180, highRisk: 30 } },
      lockStatus: { weight: 0.25, penalties: { locked: 25, unlocked: 0 } },
      registrarQuality: { weight: 0.15, buckets: { trusted: 0, unknown: 15 } },
      renewalHistory: { weight: 0.10, bonus: { threshold: 2, reduction: -10 } },
      liquiditySignals: { weight: 0.05, bonus: { threshold: 3, reduction: -5 } }
    }
  },
  rarityScore: {
    weights: {
      nameLength: { weight: 0.40, thresholds: { maxRarity: 4, minRarity: 12 } },
      dictionaryBrandable: { weight: 0.25, bonuses: { dictionary: 25, brandable: 15, random: 0 } },
      tldScarcity: { weight: 0.25, buckets: { ultra: 25, rare: 20, common: 10, abundant: 0 } },
      historicDemand: { weight: 0.10, baseValue: 10 }
    }
  },
  momentumScore: {
    weights: {
      activityDelta: { weight: 0.70, periods: { recent: 7, baseline: 30 } },
      recentEvents: { weight: 0.30, timeWindow: 72 }
    }
  },
  forecastScore: {
    weights: { momentum: 0.5, rarity: 0.3, risk: -0.4 },
    confidenceInterval: { base: 0.10, riskMultiplier: 0.10 }
  }
}

// Dictionary words for brandability check
const DICTIONARY_WORDS = new Set([
  'home', 'tech', 'data', 'cloud', 'smart', 'digital', 'crypto', 'web', 'meta', 'verse',
  'chain', 'token', 'coin', 'defi', 'nft', 'dao', 'swap', 'vault', 'stake', 'yield'
])

// TLD scarcity buckets
const TLD_SCARCITY: Record<string, 'ultra' | 'rare' | 'common' | 'abundant'> = {
  'com': 'common',
  'net': 'common',
  'org': 'common',
  'io': 'rare',
  'xyz': 'abundant',
  'eth': 'ultra',
  'crypto': 'rare',
  'nft': 'rare',
  'dao': 'rare',
  'defi': 'ultra'
}

export class ScoringEngine {
  private weights: ScoringWeights

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights
  }

  /**
   * Calculate all scores for a domain
   */
  calculateScores(
    domain: {
      name: string
      tld: string
      expiresAt: string | Date
      lockStatus?: boolean
      registrarId?: number
      renewalCount?: number
      offerCount?: number
      activity7d?: number
      activity30d?: number
      recentEvents?: Array<{ type: string; timestamp: Date }>
    }
  ): DomainScores {
    const riskScore = this.calculateRiskScore(domain)
    const rarityScore = this.calculateRarityScore(domain)
    const momentumScore = this.calculateMomentumScore(domain)
    const forecastScore = this.calculateForecastScore(riskScore.score, rarityScore.score, momentumScore.score)

    return {
      risk: Math.round(riskScore.score),
      rarity: Math.round(rarityScore.score),
      momentum: Math.round(momentumScore.score),
      forecast: Math.round(forecastScore.value),
      forecastLow: Math.round(forecastScore.low),
      forecastHigh: Math.round(forecastScore.high),
      explainers: {
        risk: riskScore.factors,
        rarity: rarityScore.factors,
        momentum: momentumScore.factors,
        forecast: forecastScore.factors
      }
    }
  }

  /**
   * Calculate risk score (0-100, higher = riskier)
   */
  private calculateRiskScore(domain: any): { score: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = []
    let score = 0

    // Expiry buffer (45%)
    const daysUntilExpiry = this.getDaysUntilExpiry(domain.expiresAt)
    const expiryWeight = this.weights.riskScore.weights.expiryBuffer
    let expiryRisk = 0
    
    if (daysUntilExpiry <= expiryWeight.thresholds.highRisk) {
      expiryRisk = 100
    } else if (daysUntilExpiry >= expiryWeight.thresholds.lowRisk) {
      expiryRisk = 0
    } else {
      // Linear interpolation
      const range = expiryWeight.thresholds.lowRisk - expiryWeight.thresholds.highRisk
      const position = daysUntilExpiry - expiryWeight.thresholds.highRisk
      expiryRisk = 100 - (position / range) * 100
    }
    
    const expiryContribution = expiryRisk * expiryWeight.weight
    score += expiryContribution
    factors.push({
      name: 'Expiry Buffer',
      value: daysUntilExpiry,
      weight: expiryWeight.weight,
      contribution: expiryContribution,
      description: `${daysUntilExpiry} days until expiration`
    })

    // Lock status (25%)
    const lockWeight = this.weights.riskScore.weights.lockStatus
    const lockPenalty = domain.lockStatus ? lockWeight.penalties.locked : lockWeight.penalties.unlocked
    const lockContribution = lockPenalty * lockWeight.weight
    score += lockContribution
    factors.push({
      name: 'Lock Status',
      value: domain.lockStatus ? 1 : 0,
      weight: lockWeight.weight,
      contribution: lockContribution,
      description: domain.lockStatus ? 'Domain is locked' : 'Domain is unlocked'
    })

    // Registrar quality (15%)
    const registrarWeight = this.weights.riskScore.weights.registrarQuality
    const registrarRisk = this.isKnownRegistrar(domain.registrarId) 
      ? registrarWeight.buckets.trusted 
      : registrarWeight.buckets.unknown
    const registrarContribution = registrarRisk * registrarWeight.weight
    score += registrarContribution
    factors.push({
      name: 'Registrar Quality',
      value: domain.registrarId || 0,
      weight: registrarWeight.weight,
      contribution: registrarContribution,
      description: this.isKnownRegistrar(domain.registrarId) ? 'Trusted registrar' : 'Unknown registrar'
    })

    // Renewal history (10%)
    const renewalWeight = this.weights.riskScore.weights.renewalHistory
    const renewalBonus = (domain.renewalCount || 0) >= renewalWeight.bonus.threshold 
      ? renewalWeight.bonus.reduction 
      : 0
    const renewalContribution = renewalBonus * renewalWeight.weight
    score += renewalContribution
    factors.push({
      name: 'Renewal History',
      value: domain.renewalCount || 0,
      weight: renewalWeight.weight,
      contribution: renewalContribution,
      description: `${domain.renewalCount || 0} renewals`
    })

    // Liquidity signals (5%)
    const liquidityWeight = this.weights.riskScore.weights.liquiditySignals
    const liquidityBonus = (domain.offerCount || 0) >= liquidityWeight.bonus.threshold 
      ? liquidityWeight.bonus.reduction 
      : 0
    const liquidityContribution = liquidityBonus * liquidityWeight.weight
    score += liquidityContribution
    factors.push({
      name: 'Market Liquidity',
      value: domain.offerCount || 0,
      weight: liquidityWeight.weight,
      contribution: liquidityContribution,
      description: `${domain.offerCount || 0} offers in 30 days`
    })

    // Sort factors by contribution
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

    return { score: Math.max(0, Math.min(100, score)), factors: factors.slice(0, 3) }
  }

  /**
   * Calculate rarity score (0-100, higher = rarer)
   */
  private calculateRarityScore(domain: any): { score: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = []
    let score = 0

    // Name length (40%)
    const lengthWeight = this.weights.rarityScore.weights.nameLength
    const nameLength = domain.name.length
    let lengthRarity = 0
    
    if (nameLength <= lengthWeight.thresholds.maxRarity) {
      lengthRarity = 100
    } else if (nameLength >= lengthWeight.thresholds.minRarity) {
      lengthRarity = 0
    } else {
      const range = lengthWeight.thresholds.minRarity - lengthWeight.thresholds.maxRarity
      const position = lengthWeight.thresholds.minRarity - nameLength
      lengthRarity = (position / range) * 100
    }
    
    const lengthContribution = lengthRarity * lengthWeight.weight
    score += lengthContribution
    factors.push({
      name: 'Name Length',
      value: nameLength,
      weight: lengthWeight.weight,
      contribution: lengthContribution,
      description: `${nameLength} characters`
    })

    // Dictionary/Brandable (25%)
    const brandWeight = this.weights.rarityScore.weights.dictionaryBrandable
    const brandBonus = this.isDictionaryWord(domain.name) 
      ? brandWeight.bonuses.dictionary
      : this.isBrandable(domain.name) 
        ? brandWeight.bonuses.brandable 
        : brandWeight.bonuses.random
    const brandContribution = brandBonus * brandWeight.weight
    score += brandContribution
    factors.push({
      name: 'Brandability',
      value: brandBonus,
      weight: brandWeight.weight,
      contribution: brandContribution,
      description: this.isDictionaryWord(domain.name) ? 'Dictionary word' : 
                   this.isBrandable(domain.name) ? 'Brandable' : 'Random string'
    })

    // TLD scarcity (25%)
    const tldWeight = this.weights.rarityScore.weights.tldScarcity
    const tldBucket = TLD_SCARCITY[domain.tld] || 'common'
    const tldBonus = tldWeight.buckets[tldBucket] || 0
    const tldContribution = tldBonus * tldWeight.weight
    score += tldContribution
    factors.push({
      name: 'TLD Scarcity',
      value: tldBonus,
      weight: tldWeight.weight,
      contribution: tldContribution,
      description: `.${domain.tld} is ${tldBucket}`
    })

    // Historic demand (10%)
    const demandWeight = this.weights.rarityScore.weights.historicDemand
    const demandValue = Math.min(demandWeight.baseValue, (domain.offerCount || 0) * 2)
    const demandContribution = demandValue * demandWeight.weight
    score += demandContribution
    factors.push({
      name: 'Historic Demand',
      value: domain.offerCount || 0,
      weight: demandWeight.weight,
      contribution: demandContribution,
      description: `${domain.offerCount || 0} unique bidders`
    })

    // Sort factors by contribution
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

    return { score: Math.max(0, Math.min(100, score)), factors: factors.slice(0, 3) }
  }

  /**
   * Calculate momentum score (0-100, higher = more momentum)
   */
  private calculateMomentumScore(domain: any): { score: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = []
    let score = 0

    // Activity delta (70%)
    const deltaWeight = this.weights.momentumScore.weights.activityDelta
    const recent = domain.activity7d || 0
    const baseline = domain.activity30d || 0
    let delta = 0
    
    if (baseline > 0) {
      delta = ((recent * 4.3) - baseline) / baseline * 100 // 4.3 to normalize 7d to 30d
    }
    
    const deltaScore = Math.max(0, Math.min(100, 50 + delta / 2))
    const deltaContribution = deltaScore * deltaWeight.weight
    score += deltaContribution
    factors.push({
      name: 'Activity Trend',
      value: delta,
      weight: deltaWeight.weight,
      contribution: deltaContribution,
      description: `${delta > 0 ? '+' : ''}${Math.round(delta)}% vs 30d average`
    })

    // Recent events (30%)
    const eventWeight = this.weights.momentumScore.weights.recentEvents
    const recentEventCount = this.countRecentEvents(domain.recentEvents, eventWeight.timeWindow)
    const eventScore = Math.min(100, recentEventCount * 33)
    const eventContribution = eventScore * eventWeight.weight
    score += eventContribution
    factors.push({
      name: 'Recent Activity',
      value: recentEventCount,
      weight: eventWeight.weight,
      contribution: eventContribution,
      description: `${recentEventCount} events in ${eventWeight.timeWindow}h`
    })

    // Sort factors by contribution
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

    return { score: Math.max(0, Math.min(100, score)), factors: factors.slice(0, 2) }
  }

  /**
   * Calculate forecast score
   */
  private calculateForecastScore(
    risk: number, 
    rarity: number, 
    momentum: number
  ): { value: number; low: number; high: number; factors: ScoreFactor[] } {
    const weights = this.weights.forecastScore.weights
    const ci = this.weights.forecastScore.confidenceInterval
    
    // Normalize scores to 0-1
    const riskNorm = risk / 100
    const rarityNorm = rarity / 100
    const momentumNorm = momentum / 100
    
    // Base value (could be market average or domain-specific)
    const base = 50
    
    // Calculate forecast
    const forecast = base * (1 + 
      weights.momentum * momentumNorm + 
      weights.rarity * rarityNorm + 
      weights.risk * riskNorm)
    
    // Calculate confidence interval
    const interval = forecast * (ci.base + ci.riskMultiplier * riskNorm)
    
    const factors: ScoreFactor[] = [
      {
        name: 'Momentum Impact',
        value: momentum,
        weight: weights.momentum,
        contribution: base * weights.momentum * momentumNorm,
        description: `${momentum}% momentum score`
      },
      {
        name: 'Rarity Impact',
        value: rarity,
        weight: weights.rarity,
        contribution: base * weights.rarity * rarityNorm,
        description: `${rarity}% rarity score`
      },
      {
        name: 'Risk Impact',
        value: risk,
        weight: Math.abs(weights.risk),
        contribution: base * weights.risk * riskNorm,
        description: `${risk}% risk score`
      }
    ]
    
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    
    return {
      value: forecast,
      low: forecast - interval,
      high: forecast + interval,
      factors
    }
  }

  // Helper methods
  private getDaysUntilExpiry(expiresAt: string | Date): number {
    const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  private isKnownRegistrar(registrarId?: number): boolean {
    // Known good registrars (example IDs)
    const knownRegistrars = [1, 2, 3, 101, 102, 103]
    return registrarId ? knownRegistrars.includes(registrarId) : false
  }

  private isDictionaryWord(name: string): boolean {
    return DICTIONARY_WORDS.has(name.toLowerCase())
  }

  private isBrandable(name: string): boolean {
    // Simple brandability check: pronounceable, 4-8 chars, contains vowels
    if (name.length < 4 || name.length > 8) return false
    const vowels = 'aeiou'
    const hasVowels = name.split('').some(char => vowels.includes(char.toLowerCase()))
    const hasConsonants = name.split('').some(char => !vowels.includes(char.toLowerCase()))
    return hasVowels && hasConsonants
  }

  private countRecentEvents(events?: Array<{ type: string; timestamp: Date }>, hoursWindow: number = 72): number {
    if (!events || events.length === 0) return 0
    
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hoursWindow)
    
    return events.filter(event => {
      const eventTime = typeof event.timestamp === 'string' ? new Date(event.timestamp) : event.timestamp
      return eventTime > cutoff
    }).length
  }
}

// Export default instance
export const scoringEngine = new ScoringEngine()