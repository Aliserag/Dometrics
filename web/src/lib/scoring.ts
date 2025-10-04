/**
 * Dometrics Scoring Engine
 * Client-side domain scoring with explainable AI
 */

import { TokenModel } from './doma-client'
import { aiValuationService } from './ai-valuation'

export interface DomainScores {
  risk: number
  rarity: number
  momentum: number
  forecast: number
  forecastLow: number
  forecastHigh: number
  currentValue: number
  projectedValue: number
  valueConfidence: number
  explainers: {
    risk: ScoreFactor[]
    rarity: ScoreFactor[]
    momentum: ScoreFactor[]
    forecast: ScoreFactor[]
    value: ScoreFactor[]
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
      expiryBuffer: {
        weight: number
        tiers: {
          critical: { days: number; risk: number }
          urgent: { days: number; risk: number }
          warning: { days: number; risk: number }
          moderate: { days: number; risk: number }
          stable: { days: number; risk: number }
          safe: { days: number; risk: number }
          veryLow: { days: number; risk: number }
        }
      }
      lockStatus: {
        weight: number
        adjustments: { locked: number; unlocked: number }
      }
      ownershipStability: {
        weight: number
        factors: {
          domainAge: {
            weight: number
            tiers: {
              new: { days: number; risk: number }
              young: { days: number; risk: number }
              established: { days: number; risk: number }
              mature: { days: number; risk: number }
            }
          }
          renewalRate: {
            weight: number
            tiers: {
              never: { count: number; risk: number }
              rare: { count: number; risk: number }
              normal: { count: number; risk: number }
              frequent: { count: number; risk: number }
            }
          }
        }
      }
      marketActivity: {
        weight: number
        factors: {
          offerActivity: {
            weight: number
            tiers: {
              none: { offers: number; risk: number }
              low: { offers: number; risk: number }
              moderate: { offers: number; risk: number }
              high: { offers: number; risk: number }
              veryHigh: { offers: number; risk: number }
            }
          }
          activityRecency: {
            weight: number
            tiers: {
              stale: { days: number; risk: number }
              quiet: { days: number; risk: number }
              moderate: { days: number; risk: number }
              active: { days: number; risk: number }
              hot: { days: number; risk: number }
            }
          }
        }
      }
      registrarTrust: {
        weight: number
        tiers: {
          verified: number
          known: number
          unknown: number
          suspicious: number
        }
      }
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
      expiryBuffer: {
        weight: 0.35,
        tiers: {
          critical: { days: 14, risk: 100 },
          urgent: { days: 30, risk: 85 },
          warning: { days: 60, risk: 65 },
          moderate: { days: 90, risk: 45 },
          stable: { days: 180, risk: 25 },
          safe: { days: 365, risk: 10 },
          veryLow: { days: 730, risk: 0 }
        }
      },
      lockStatus: {
        weight: 0.15,
        adjustments: { locked: -15, unlocked: 15 }
      },
      ownershipStability: {
        weight: 0.20,
        factors: {
          domainAge: {
            weight: 0.6,
            tiers: {
              new: { days: 30, risk: 20 },
              young: { days: 90, risk: 10 },
              established: { days: 365, risk: 0 },
              mature: { days: 730, risk: -10 }
            }
          },
          renewalRate: {
            weight: 0.4,
            tiers: {
              never: { count: 0, risk: 15 },
              rare: { count: 1, risk: 5 },
              normal: { count: 2, risk: 0 },
              frequent: { count: 3, risk: -5 }
            }
          }
        }
      },
      marketActivity: {
        weight: 0.20,
        factors: {
          offerActivity: {
            weight: 0.6,
            tiers: {
              none: { offers: 0, risk: 10 },
              low: { offers: 1, risk: 5 },
              moderate: { offers: 3, risk: 0 },
              high: { offers: 5, risk: -5 },
              veryHigh: { offers: 10, risk: -10 }
            }
          },
          activityRecency: {
            weight: 0.4,
            tiers: {
              stale: { days: 180, risk: 15 },
              quiet: { days: 90, risk: 10 },
              moderate: { days: 30, risk: 5 },
              active: { days: 7, risk: 0 },
              hot: { days: 1, risk: -5 }
            }
          }
        }
      },
      registrarTrust: {
        weight: 0.10,
        tiers: { verified: 0, known: 5, unknown: 15, suspicious: 30 }
      }
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

// High-value keywords for domain valuation
const HIGH_VALUE_KEYWORDS = new Set([
  'crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'dao', 'web3', 'metaverse',
  'ai', 'tech', 'app', 'cloud', 'digital', 'online', 'mobile', 'smart', 'auto', 'finance',
  'money', 'pay', 'bank', 'invest', 'trade', 'shop', 'store', 'buy', 'sell', 'market',
  'health', 'medical', 'fitness', 'food', 'travel', 'hotel', 'book', 'learn', 'education',
  'game', 'play', 'music', 'video', 'photo', 'social', 'chat', 'dating', 'love', 'sex'
])

// Medium-value keywords  
const MEDIUM_VALUE_KEYWORDS = new Set([
  'home', 'house', 'real', 'estate', 'car', 'vehicle', 'job', 'work', 'news', 'blog',
  'forum', 'community', 'service', 'help', 'support', 'info', 'guide', 'tips', 'review',
  'best', 'top', 'good', 'quality', 'premium', 'pro', 'expert', 'master', 'king', 'queen',
  'world', 'global', 'international', 'local', 'city', 'state', 'country', 'usa', 'america'
])

// Dictionary words for brandability check
const DICTIONARY_WORDS = new Set([
  ...HIGH_VALUE_KEYWORDS,
  ...MEDIUM_VALUE_KEYWORDS,
  'get', 'make', 'find', 'search', 'go', 'come', 'free', 'new', 'old', 'big', 'small'
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
  async calculateScores(
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
      registrar?: string
      tokenizedAt?: string | Date
    }
  ): Promise<DomainScores> {
    const riskScore = this.calculateRiskScore(domain)
    const rarityScore = this.calculateRarityScore(domain)
    const momentumScore = this.calculateMomentumScore(domain)
    const forecastScore = this.calculateForecastScore(riskScore.score, rarityScore.score, momentumScore.score)
    
    // Use AI for domain valuation
    const daysUntilExpiry = this.getDaysUntilExpiry(domain.expiresAt)
    const aiValuation = await aiValuationService.evaluateDomain(
      domain.name,
      domain.tld,
      {
        daysUntilExpiry,
        offerCount: domain.offerCount || 0,
        activity30d: domain.activity30d || 0,
        registrar: domain.registrar || 'Unknown',
        transferLock: domain.lockStatus || false
      }
    )

    return {
      risk: Math.round(riskScore.score),
      rarity: Math.round(rarityScore.score),
      momentum: Math.round(momentumScore.score),
      forecast: Math.round(forecastScore.value),
      forecastLow: Math.round(forecastScore.low),
      forecastHigh: Math.round(forecastScore.high),
      currentValue: Math.round(aiValuation.currentValue),
      projectedValue: Math.round(aiValuation.projectedValue),
      valueConfidence: Math.round(aiValuation.confidence),
      explainers: {
        risk: riskScore.factors,
        rarity: rarityScore.factors,
        momentum: momentumScore.factors,
        forecast: forecastScore.factors,
        value: aiValuation.factors
      }
    }
  }

  /**
   * Calculate all scores for a domain (synchronous version for fallback)
   */
  calculateScoresSync(
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
      tokenizedAt?: string | Date
    }
  ): DomainScores {
    const riskScore = this.calculateRiskScore(domain)
    const rarityScore = this.calculateRarityScore(domain)
    const momentumScore = this.calculateMomentumScore(domain)
    const forecastScore = this.calculateForecastScore(riskScore.score, rarityScore.score, momentumScore.score)
    const valueEstimation = this.calculateDomainValue(domain, riskScore.score, rarityScore.score, momentumScore.score)

    return {
      risk: Math.round(riskScore.score),
      rarity: Math.round(rarityScore.score),
      momentum: Math.round(momentumScore.score),
      forecast: Math.round(forecastScore.value),
      forecastLow: Math.round(forecastScore.low),
      forecastHigh: Math.round(forecastScore.high),
      currentValue: Math.round(valueEstimation.currentValue),
      projectedValue: Math.round(valueEstimation.projectedValue),
      valueConfidence: Math.round(valueEstimation.confidence),
      explainers: {
        risk: riskScore.factors,
        rarity: rarityScore.factors,
        momentum: momentumScore.factors,
        forecast: forecastScore.factors,
        value: valueEstimation.factors
      }
    }
  }

  /**
   * Calculate risk score (0-100, higher = riskier)
   * Improved algorithm with granular tiers and intelligent factors
   */
  private calculateRiskScore(domain: any): { score: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = []
    let score = 0

    // 1. Expiry Buffer (35%) - Granular tiered approach
    const daysUntilExpiry = this.getDaysUntilExpiry(domain.expiresAt)
    const expiryWeight = this.weights.riskScore.weights.expiryBuffer
    const tiers = expiryWeight.tiers

    let expiryRisk = 0
    let expiryTier = 'veryLow'

    if (daysUntilExpiry <= tiers.critical.days) {
      expiryRisk = tiers.critical.risk
      expiryTier = 'critical'
    } else if (daysUntilExpiry <= tiers.urgent.days) {
      expiryRisk = tiers.urgent.risk
      expiryTier = 'urgent'
    } else if (daysUntilExpiry <= tiers.warning.days) {
      expiryRisk = tiers.warning.risk
      expiryTier = 'warning'
    } else if (daysUntilExpiry <= tiers.moderate.days) {
      expiryRisk = tiers.moderate.risk
      expiryTier = 'moderate'
    } else if (daysUntilExpiry <= tiers.stable.days) {
      expiryRisk = tiers.stable.risk
      expiryTier = 'stable'
    } else if (daysUntilExpiry <= tiers.safe.days) {
      expiryRisk = tiers.safe.risk
      expiryTier = 'safe'
    } else {
      expiryRisk = tiers.veryLow.risk
      expiryTier = 'veryLow'
    }

    const expiryContribution = expiryRisk * expiryWeight.weight
    score += expiryContribution
    factors.push({
      name: 'Expiry Risk',
      value: daysUntilExpiry,
      weight: expiryWeight.weight,
      contribution: expiryContribution,
      description: `${daysUntilExpiry} days (${expiryTier})`
    })

    // 2. Lock Status (15%) - Locked = SAFER (reduces risk)
    const lockWeight = this.weights.riskScore.weights.lockStatus
    const lockAdjustment = domain.lockStatus
      ? lockWeight.adjustments.locked
      : lockWeight.adjustments.unlocked
    const lockContribution = lockAdjustment * lockWeight.weight
    score += lockContribution
    factors.push({
      name: 'Transfer Lock',
      value: domain.lockStatus ? 1 : 0,
      weight: lockWeight.weight,
      contribution: lockContribution,
      description: domain.lockStatus ? 'Locked (safer)' : 'Unlocked (riskier)'
    })

    // 3. Ownership Stability (20%)
    const stabilityWeight = this.weights.riskScore.weights.ownershipStability

    // 3a. Domain Age (60% of stability weight)
    const domainAge = this.getDaysSinceTokenization(domain.tokenizedAt)
    const ageTiers = stabilityWeight.factors.domainAge.tiers
    let ageRisk = 0
    let ageTier = 'new'

    if (domainAge >= ageTiers.mature.days) {
      ageRisk = ageTiers.mature.risk
      ageTier = 'mature'
    } else if (domainAge >= ageTiers.established.days) {
      ageRisk = ageTiers.established.risk
      ageTier = 'established'
    } else if (domainAge >= ageTiers.young.days) {
      ageRisk = ageTiers.young.risk
      ageTier = 'young'
    } else {
      ageRisk = ageTiers.new.risk
      ageTier = 'new'
    }

    const ageContribution = ageRisk * stabilityWeight.weight * stabilityWeight.factors.domainAge.weight
    score += ageContribution

    // 3b. Renewal Rate (40% of stability weight)
    const renewalCount = domain.renewalCount || 0
    const renewalTiers = stabilityWeight.factors.renewalRate.tiers
    let renewalRisk = 0
    let renewalTier = 'never'

    if (renewalCount >= renewalTiers.frequent.count) {
      renewalRisk = renewalTiers.frequent.risk
      renewalTier = 'frequent'
    } else if (renewalCount >= renewalTiers.normal.count) {
      renewalRisk = renewalTiers.normal.risk
      renewalTier = 'normal'
    } else if (renewalCount >= renewalTiers.rare.count) {
      renewalRisk = renewalTiers.rare.risk
      renewalTier = 'rare'
    } else {
      renewalRisk = renewalTiers.never.risk
      renewalTier = 'never'
    }

    const renewalContribution = renewalRisk * stabilityWeight.weight * stabilityWeight.factors.renewalRate.weight
    score += renewalContribution

    factors.push({
      name: 'Ownership Stability',
      value: domainAge,
      weight: stabilityWeight.weight,
      contribution: ageContribution + renewalContribution,
      description: `${Math.floor(domainAge)} days old (${ageTier}), ${renewalCount} renewals (${renewalTier})`
    })

    // 4. Market Activity (20%)
    const activityWeight = this.weights.riskScore.weights.marketActivity

    // 4a. Offer Activity (60% of activity weight)
    const offerCount = domain.offerCount || 0
    const offerTiers = activityWeight.factors.offerActivity.tiers
    let offerRisk = 0
    let offerTier = 'none'

    if (offerCount >= offerTiers.veryHigh.offers) {
      offerRisk = offerTiers.veryHigh.risk
      offerTier = 'veryHigh'
    } else if (offerCount >= offerTiers.high.offers) {
      offerRisk = offerTiers.high.risk
      offerTier = 'high'
    } else if (offerCount >= offerTiers.moderate.offers) {
      offerRisk = offerTiers.moderate.risk
      offerTier = 'moderate'
    } else if (offerCount >= offerTiers.low.offers) {
      offerRisk = offerTiers.low.risk
      offerTier = 'low'
    } else {
      offerRisk = offerTiers.none.risk
      offerTier = 'none'
    }

    const offerContribution = offerRisk * activityWeight.weight * activityWeight.factors.offerActivity.weight
    score += offerContribution

    // 4b. Activity Recency (40% of activity weight)
    const activity7d = domain.activity7d || 0
    const activity30d = domain.activity30d || 0
    const daysSinceActivity = activity7d > 0 ? 0 : (activity30d > 0 ? 15 : 90)

    const recencyTiers = activityWeight.factors.activityRecency.tiers
    let recencyRisk = 0
    let recencyTier = 'stale'

    if (daysSinceActivity <= recencyTiers.hot.days) {
      recencyRisk = recencyTiers.hot.risk
      recencyTier = 'hot'
    } else if (daysSinceActivity <= recencyTiers.active.days) {
      recencyRisk = recencyTiers.active.risk
      recencyTier = 'active'
    } else if (daysSinceActivity <= recencyTiers.moderate.days) {
      recencyRisk = recencyTiers.moderate.risk
      recencyTier = 'moderate'
    } else if (daysSinceActivity <= recencyTiers.quiet.days) {
      recencyRisk = recencyTiers.quiet.risk
      recencyTier = 'quiet'
    } else {
      recencyRisk = recencyTiers.stale.risk
      recencyTier = 'stale'
    }

    const recencyContribution = recencyRisk * activityWeight.weight * activityWeight.factors.activityRecency.weight
    score += recencyContribution

    factors.push({
      name: 'Market Activity',
      value: offerCount,
      weight: activityWeight.weight,
      contribution: offerContribution + recencyContribution,
      description: `${offerCount} offers (${offerTier}), last activity ${recencyTier}`
    })

    // 5. Registrar Trust (10%)
    const registrarWeight = this.weights.riskScore.weights.registrarTrust
    const registrarId = domain.registrarId || 0
    let registrarRisk = 0
    let registrarTier = 'unknown'

    if (this.isKnownRegistrar(registrarId)) {
      registrarRisk = registrarWeight.tiers.verified
      registrarTier = 'verified'
    } else if (registrarId > 0) {
      registrarRisk = registrarWeight.tiers.known
      registrarTier = 'known'
    } else {
      registrarRisk = registrarWeight.tiers.unknown
      registrarTier = 'unknown'
    }

    const registrarContribution = registrarRisk * registrarWeight.weight
    score += registrarContribution
    factors.push({
      name: 'Registrar Trust',
      value: registrarId,
      weight: registrarWeight.weight,
      contribution: registrarContribution,
      description: `${registrarTier} registrar`
    })

    // 6. Name Quality Risk Adjustment (adds variation based on domain desirability)
    // Less desirable domains (long names, obscure TLDs) have higher abandonment risk
    const nameLength = domain.name?.length || 10
    let qualityAdjustment = 0

    if (nameLength <= 4) {
      qualityAdjustment = -15 // Ultra-short = very desirable = lower risk
    } else if (nameLength <= 7) {
      qualityAdjustment = -8 // Short = desirable = lower risk
    } else if (nameLength <= 12) {
      qualityAdjustment = 0 // Medium = neutral
    } else if (nameLength <= 18) {
      qualityAdjustment = 12 // Long = less desirable = higher risk
    } else {
      qualityAdjustment = 25 // Very long = undesirable = high risk
    }

    // Obscure TLDs add risk
    const obscureTLDs = ['xyz', 'top', 'site', 'online', 'store', 'tech', 'space']
    const premiumTLDs = ['com', 'net', 'org', 'io', 'ai', 'co']
    if (obscureTLDs.includes(domain.tld)) {
      qualityAdjustment += 10
    } else if (premiumTLDs.includes(domain.tld)) {
      qualityAdjustment -= 5
    }

    score += qualityAdjustment

    if (Math.abs(qualityAdjustment) > 3) {
      factors.push({
        name: 'Name Quality',
        value: nameLength,
        weight: 0.15,
        contribution: qualityAdjustment,
        description: `${nameLength} chars, .${domain.tld} TLD`
      })
    }

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

    // Activity delta (50% - reduced from 70%)
    const deltaWeight = 0.50
    const recent = domain.activity7d || 0
    const baseline = domain.activity30d || 0
    let delta = 0

    if (baseline > 0) {
      delta = ((recent * 4.3) - baseline) / baseline * 100 // 4.3 to normalize 7d to 30d
    }

    const deltaScore = Math.max(0, Math.min(100, 50 + delta / 2))
    const deltaContribution = deltaScore * deltaWeight
    score += deltaContribution
    factors.push({
      name: 'Activity Trend',
      value: delta,
      weight: deltaWeight,
      contribution: deltaContribution,
      description: `${delta > 0 ? '+' : ''}${Math.round(delta)}% vs 30d average`
    })

    // Recent events (25% - reduced from 30%)
    const eventWeight = 0.25
    const recentEventCount = this.countRecentEvents(domain.recentEvents, 72)
    const eventScore = Math.min(100, recentEventCount * 33)
    const eventContribution = eventScore * eventWeight
    score += eventContribution
    factors.push({
      name: 'Recent Activity',
      value: recentEventCount,
      weight: eventWeight,
      contribution: eventContribution,
      description: `${recentEventCount} events in 72h`
    })

    // Google Trends Popularity (25% - new!)
    const trendsWeight = 0.25
    const trendsScore = domain.trendsPopularity || 50 // Default to neutral if not available
    const trendsTrend = domain.trendsTrend || 'stable'

    // Apply trend direction multiplier
    let trendsAdjusted = trendsScore
    if (trendsTrend === 'rising') {
      trendsAdjusted = Math.min(100, trendsScore * 1.15) // 15% boost for rising
    } else if (trendsTrend === 'declining') {
      trendsAdjusted = trendsScore * 0.85 // 15% penalty for declining
    }

    const trendsContribution = trendsAdjusted * trendsWeight
    score += trendsContribution
    factors.push({
      name: 'Search Popularity',
      value: trendsScore,
      weight: trendsWeight,
      contribution: trendsContribution,
      description: `${trendsScore}/100 interest (${trendsTrend})`
    })

    // Sort factors by contribution
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

    return { score: Math.max(0, Math.min(100, score)), factors: factors.slice(0, 3) }
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
    
    // Calculate 6-month growth potential based on domain characteristics
    // This matches the logic in the chart generation for consistency
    const baseGrowthRate = 0.15 // 15% annual base growth
    
    // Apply score-based multipliers
    const rarityBoost = rarityNorm * 0.5 // Up to 50% boost for rare domains
    const momentumBoost = (momentum - 50) / 500 // -10% to +10% based on momentum
    const riskPenalty = riskNorm * 0.3 // Up to 30% penalty for high risk
    
    // Calculate effective annual growth rate
    const annualGrowthRate = baseGrowthRate * (1 + rarityBoost) + momentumBoost - riskPenalty
    
    // Convert to 6-month growth percentage
    const sixMonthGrowth = Math.pow(1 + Math.max(0, annualGrowthRate), 0.5) - 1
    
    // Convert growth rate to 0-100 score
    // 0% growth = 40 score, 25% growth = 70 score, 50% growth = 100 score
    const forecast = 40 + Math.min(sixMonthGrowth * 120, 60)
    
    // Calculate confidence interval (60% confidence at 6 months)
    const interval = 8 // Fixed interval for 60% confidence
    
    const factors: ScoreFactor[] = [
      {
        name: 'Growth Potential',
        value: Math.round(sixMonthGrowth * 100),
        weight: 0.4,
        contribution: sixMonthGrowth * 40,
        description: `${Math.round(sixMonthGrowth * 100)}% projected 6-month growth`
      },
      {
        name: 'Market Momentum',
        value: momentum,
        weight: weights.momentum,
        contribution: momentumBoost * 100,
        description: `${momentum}% momentum driving ${momentumBoost > 0 ? 'growth' : 'decline'}`
      },
      {
        name: 'Domain Rarity',
        value: rarity,
        weight: weights.rarity,
        contribution: rarityBoost * baseGrowthRate * 100,
        description: `${rarity}% rarity enhancing value`
      },
      {
        name: 'Risk Factor',
        value: risk,
        weight: Math.abs(weights.risk),
        contribution: -riskPenalty * 100,
        description: `${risk}% risk reducing growth potential`
      }
    ]
    
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    
    return {
      value: forecast,
      low: forecast - interval,
      high: forecast + interval,
      factors: factors.slice(0, 2)
    }
  }

  /**
   * Calculate comprehensive domain value estimation (in USD)
   */
  private calculateDomainValue(
    domain: any,
    riskScore: number,
    rarityScore: number,
    momentumScore: number
  ): { currentValue: number; projectedValue: number; confidence: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = []
    
    // Base value calculation
    const baseValue = 100 // Minimum base value
    
    // 1. Length-based value (shorter = more valuable)
    const nameLength = domain.name.length
    let lengthMultiplier = 1
    if (nameLength <= 3) {
      lengthMultiplier = 50 // Ultra premium
    } else if (nameLength <= 4) {
      lengthMultiplier = 25 // Premium
    } else if (nameLength <= 5) {
      lengthMultiplier = 10 // High value
    } else if (nameLength <= 7) {
      lengthMultiplier = 5 // Good value
    } else if (nameLength <= 10) {
      lengthMultiplier = 2 // Standard
    } else {
      lengthMultiplier = 1 // Basic
    }
    
    const lengthValue = baseValue * lengthMultiplier
    factors.push({
      name: 'Length Premium',
      value: nameLength,
      weight: 0.3,
      contribution: lengthValue - baseValue,
      description: `${nameLength} character domain`
    })
    
    // 2. Keyword analysis
    const domainName = domain.name.toLowerCase()
    let keywordMultiplier = 1
    let keywordType = 'generic'
    
    // Check for high-value keywords
    for (const keyword of HIGH_VALUE_KEYWORDS) {
      if (domainName.includes(keyword)) {
        keywordMultiplier = Math.max(keywordMultiplier, 15)
        keywordType = 'high-value'
        break
      }
    }
    
    // Check for medium-value keywords if no high-value found
    if (keywordMultiplier === 1) {
      for (const keyword of MEDIUM_VALUE_KEYWORDS) {
        if (domainName.includes(keyword)) {
          keywordMultiplier = Math.max(keywordMultiplier, 5)
          keywordType = 'medium-value'
          break
        }
      }
    }
    
    // Exact match bonus
    if (HIGH_VALUE_KEYWORDS.has(domainName)) {
      keywordMultiplier *= 2
      keywordType = 'exact-match-premium'
    } else if (MEDIUM_VALUE_KEYWORDS.has(domainName)) {
      keywordMultiplier *= 1.5
      keywordType = 'exact-match-good'
    }
    
    const keywordValue = lengthValue * keywordMultiplier
    factors.push({
      name: 'Keyword Value',
      value: keywordMultiplier,
      weight: 0.4,
      contribution: keywordValue - lengthValue,
      description: `${keywordType} keywords detected`
    })
    
    // 3. TLD premium/discount
    const tldBucket = TLD_SCARCITY[domain.tld] || 'common'
    let tldMultiplier = 1
    switch (tldBucket) {
      case 'ultra':
        tldMultiplier = 3
        break
      case 'rare':
        tldMultiplier = 2
        break
      case 'common':
        tldMultiplier = 1.2
        break
      case 'abundant':
        tldMultiplier = 0.8
        break
    }
    
    const tldValue = keywordValue * tldMultiplier
    factors.push({
      name: 'TLD Premium',
      value: tldMultiplier,
      weight: 0.15,
      contribution: tldValue - keywordValue,
      description: `.${domain.tld} is ${tldBucket}`
    })
    
    // 4. Market activity adjustment
    const activityMultiplier = 1 + (domain.offerCount || 0) * 0.1 + (domain.activity30d || 0) * 0.02
    const marketValue = tldValue * Math.min(activityMultiplier, 3) // Cap at 3x
    factors.push({
      name: 'Market Activity',
      value: domain.offerCount || 0,
      weight: 0.1,
      contribution: marketValue - tldValue,
      description: `${domain.offerCount || 0} offers, ${domain.activity30d || 0} activities`
    })
    
    // 5. Risk adjustment (higher risk = lower value)
    const riskMultiplier = Math.max(0.3, 1 - (riskScore / 100) * 0.7) // 30% to 100% of value
    const riskAdjustedValue = marketValue * riskMultiplier
    factors.push({
      name: 'Risk Adjustment',
      value: riskScore,
      weight: 0.05,
      contribution: riskAdjustedValue - marketValue,
      description: `${riskScore} risk score adjustment`
    })
    
    const currentValue = riskAdjustedValue
    
    // 6. Projected value (6 months) using momentum and market trends
    // More nuanced growth model based on domain scores
    const baseGrowthRate = 0.075 // 7.5% base 6-month growth (15% annual)

    // Momentum-based growth adjustment (-10% to +30%)
    const momentumAdjustment = ((momentumScore - 50) / 100) * 0.4 // -20% to +20%

    // Rarity-based growth adjustment (0% to +25%)
    const rarityAdjustment = (rarityScore / 100) * 0.25

    // Risk penalty (0% to -15%)
    const riskPenalty = (riskScore / 100) * 0.15

    // Calculate total growth rate
    const totalGrowthRate = baseGrowthRate + momentumAdjustment + rarityAdjustment - riskPenalty

    // Apply growth to current value
    const projectionMultiplier = 1 + totalGrowthRate
    const projectedValue = currentValue * projectionMultiplier
    
    // 7. Confidence score based on data quality
    let confidence = 70 // Base confidence
    
    // More data = higher confidence
    if ((domain.activity30d || 0) > 10) confidence += 10
    if ((domain.offerCount || 0) > 3) confidence += 10
    if (keywordType !== 'generic') confidence += 10
    
    // Limit confidence
    confidence = Math.min(95, confidence)
    
    // Sort factors by contribution
    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    
    return {
      currentValue: Math.max(100, currentValue), // Minimum $100
      projectedValue: Math.max(100, projectedValue),
      confidence,
      factors: factors.slice(0, 4) // Top 4 factors
    }
  }

  // Helper methods
  private getDaysUntilExpiry(expiresAt: string | Date): number {
    const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  private getDaysSinceTokenization(tokenizedAt?: string | Date): number {
    if (!tokenizedAt) {
      // If no tokenization date provided, assume it's been tokenized for a while (stable)
      return 365
    }
    
    const tokenization = typeof tokenizedAt === 'string' ? new Date(tokenizedAt) : tokenizedAt
    const now = new Date()
    const diff = now.getTime() - tokenization.getTime()
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