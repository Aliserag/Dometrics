// Natural language search parser for domain queries

export interface SearchFilters {
  riskMin?: number
  riskMax?: number
  rarityMin?: number
  rarityMax?: number
  momentumMin?: number
  momentumMax?: number
  valueMin?: number
  valueMax?: number
  expiryDaysMin?: number
  expiryDaysMax?: number
  sortBy?: 'risk' | 'rarity' | 'momentum' | 'value' | 'newest' | 'oldest' | 'offers' | 'expiry'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  searchTerm?: string
}

export function parseNaturalLanguageQuery(query: string): SearchFilters {
  const filters: SearchFilters = {}
  const lowerQuery = query.toLowerCase().trim()

  // If it looks like a domain name, treat as search term
  if (lowerQuery.includes('.') && !lowerQuery.includes(' ')) {
    filters.searchTerm = query
    return filters
  }

  // Risk patterns
  if (lowerQuery.match(/\b(low|safe)\s*(risk)?\b/)) {
    filters.riskMax = 30
  }
  if (lowerQuery.match(/\b(medium|moderate)\s*(risk)?\b/)) {
    filters.riskMin = 30
    filters.riskMax = 70
  }
  if (lowerQuery.match(/\b(high|dangerous|risky)\s*(risk)?\b/)) {
    filters.riskMin = 70
  }

  // Risk under/over X
  const riskUnder = lowerQuery.match(/risk\s*(under|below|less\s*than|<)\s*(\d+)/i)
  if (riskUnder) {
    filters.riskMax = parseInt(riskUnder[2])
  }
  const riskOver = lowerQuery.match(/risk\s*(over|above|more\s*than|greater\s*than|>)\s*(\d+)/i)
  if (riskOver) {
    filters.riskMin = parseInt(riskOver[2])
  }

  // Rarity patterns
  if (lowerQuery.match(/\b(rare|unique|uncommon)\b/)) {
    filters.rarityMin = 70
  }
  if (lowerQuery.match(/\b(common|ordinary)\b/)) {
    filters.rarityMax = 30
  }
  const rarityOver = lowerQuery.match(/rarity\s*(over|above|>)\s*(\d+)/i)
  if (rarityOver) {
    filters.rarityMin = parseInt(rarityOver[2])
  }

  // Momentum patterns
  if (lowerQuery.match(/\b(hot|trending|popular|fast\s*growing)\b/)) {
    filters.momentumMin = 70
  }
  if (lowerQuery.match(/\b(slow|stagnant|declining)\b/)) {
    filters.momentumMax = 30
  }
  const momentumOver = lowerQuery.match(/momentum\s*(over|above|>)\s*(\d+)/i)
  if (momentumOver) {
    filters.momentumMin = parseInt(momentumOver[2])
  }

  // Value patterns
  const valueMatch = lowerQuery.match(/value\s*(over|above|under|below|>|<)\s*\$?(\d+)/i)
  if (valueMatch) {
    const amount = parseInt(valueMatch[2])
    if (valueMatch[1].match(/over|above|>/)) {
      filters.valueMin = amount
    } else {
      filters.valueMax = amount
    }
  }

  // Expiry patterns
  // Match "expiring in X days", "expires in X days", "expiry in X days"
  const expiryInMatch = lowerQuery.match(/expir(?:ing|es|y)?\s+in\s+(\d+)\s+days?/i)
  if (expiryInMatch) {
    const days = parseInt(expiryInMatch[1])
    // Allow a small range around the target (e.g., 364 ± 7 days)
    filters.expiryDaysMin = Math.max(0, days - 7)
    filters.expiryDaysMax = days + 7
  }

  // Match "expiring within X days", "expires within X days"
  const expiryWithinMatch = lowerQuery.match(/expir(?:ing|es|y)?\s+within\s+(\d+)\s+days?/i)
  if (expiryWithinMatch) {
    const days = parseInt(expiryWithinMatch[1])
    filters.expiryDaysMax = days
  }

  // Match "expiry under/over X days", "expires in less than X days"
  const expiryUnderMatch = lowerQuery.match(/expir(?:ing|es|y)?\s+(?:in\s+)?(?:under|below|less\s+than|<)\s+(\d+)\s+days?/i)
  if (expiryUnderMatch) {
    filters.expiryDaysMax = parseInt(expiryUnderMatch[1])
  }

  const expiryOverMatch = lowerQuery.match(/expir(?:ing|es|y)?\s+(?:in\s+)?(?:over|above|more\s+than|>)\s+(\d+)\s+days?/i)
  if (expiryOverMatch) {
    filters.expiryDaysMin = parseInt(expiryOverMatch[1])
  }

  // Match "expiring soon" - within 30 days
  if (lowerQuery.match(/expir(?:ing|y)?\s+soon/i)) {
    filters.expiryDaysMax = 30
  }

  // Sorting patterns
  if (lowerQuery.match(/\b(newest|latest|recent|new)\b/)) {
    filters.sortBy = 'newest'
    filters.sortOrder = 'desc'
  }
  if (lowerQuery.match(/\b(oldest|earliest|old)\b/)) {
    filters.sortBy = 'oldest'
    filters.sortOrder = 'asc'
  }
  // Handle "most rare", "rarest", etc. - sort by rarity
  if (lowerQuery.match(/\b(most|very|extremely)?\s*(rare|rarest)\b/)) {
    filters.sortBy = 'rarity'
    filters.sortOrder = 'desc'
  }
  if (lowerQuery.match(/\b(highest|largest|biggest|most|expensive|valuable)\s*(risk|value|momentum|rarity|price)?\b/)) {
    const metric = lowerQuery.match(/\b(risk|value|momentum|rarity|price)\b/)
    if (metric) {
      // Map 'price' to 'value'
      filters.sortBy = (metric[0] === 'price' ? 'value' : metric[0]) as any
    } else if (lowerQuery.includes('offer')) {
      filters.sortBy = 'offers'
    } else if (lowerQuery.match(/\b(expensive|price|valuable)\b/)) {
      filters.sortBy = 'value'
    } else {
      filters.sortBy = 'value'
    }
    filters.sortOrder = 'desc'
  }
  if (lowerQuery.match(/\b(lowest|smallest|least|cheapest)\s*(risk|value|momentum|rarity|price)?\b/)) {
    const metric = lowerQuery.match(/\b(risk|value|momentum|rarity|price)\b/)
    if (metric) {
      // Map 'price' to 'value'
      filters.sortBy = (metric[0] === 'price' ? 'value' : metric[0]) as any
    } else if (lowerQuery.match(/\b(cheapest|price)\b/)) {
      filters.sortBy = 'value'
    } else {
      filters.sortBy = 'risk'
    }
    filters.sortOrder = 'asc'
  }

  // Offer patterns
  if (lowerQuery.match(/\b(offer|offers|bid|bids)\b/) && lowerQuery.match(/\b(large|big|high|most)\b/)) {
    filters.sortBy = 'offers'
    filters.sortOrder = 'desc'
  }

  // Limit patterns (top N, first N, show me N domains/results)
  // More specific pattern to avoid matching "N days" or other numbers
  const limitMatch = lowerQuery.match(/\b(top|first|show\s*me|give\s*me)\s+(\d+)\s*(domains?|results?)?(?!\s*days?)\b/i)
  if (limitMatch) {
    filters.limit = parseInt(limitMatch[2])
  }

  // If no specific filters but contains keywords, add as search term
  if (Object.keys(filters).length === 0 && lowerQuery.length > 0) {
    filters.searchTerm = query
  }

  return filters
}

export function getSearchSuggestions(query: string): string[] {
  if (!query || query.length < 2) return []

  const suggestions = [
    'low risk domains',
    'high rarity domains',
    'fastest growing domains',
    'show me the 10 newest domains',
    'domains with largest offers',
    'risk under 20',
    'value over $10000',
    'hot trending domains',
    'rare domains',
    'safe investments',
    'high momentum',
    'top 5 domains',
    'expiring soon',
    'expiring in 30 days',
    'expiring within 90 days',
  ]

  const lowerQuery = query.toLowerCase()
  return suggestions.filter(s => s.includes(lowerQuery))
}

export function explainFilters(filters: SearchFilters): string {
  const parts: string[] = []

  if (filters.riskMin !== undefined || filters.riskMax !== undefined) {
    if (filters.riskMin && filters.riskMax) {
      parts.push(`risk between ${filters.riskMin}-${filters.riskMax}`)
    } else if (filters.riskMin) {
      parts.push(`risk over ${filters.riskMin}`)
    } else if (filters.riskMax) {
      parts.push(`risk under ${filters.riskMax}`)
    }
  }

  if (filters.rarityMin !== undefined) {
    parts.push(`rarity over ${filters.rarityMin}`)
  }

  if (filters.momentumMin !== undefined) {
    parts.push(`momentum over ${filters.momentumMin}`)
  }

  if (filters.valueMin !== undefined || filters.valueMax !== undefined) {
    if (filters.valueMin) {
      parts.push(`value over $${filters.valueMin.toLocaleString()}`)
    } else if (filters.valueMax) {
      parts.push(`value under $${filters.valueMax.toLocaleString()}`)
    }
  }

  if (filters.expiryDaysMin !== undefined || filters.expiryDaysMax !== undefined) {
    if (filters.expiryDaysMin && filters.expiryDaysMax) {
      parts.push(`expiring in ${filters.expiryDaysMin}-${filters.expiryDaysMax} days`)
    } else if (filters.expiryDaysMin) {
      parts.push(`expiring in more than ${filters.expiryDaysMin} days`)
    } else if (filters.expiryDaysMax) {
      parts.push(`expiring in less than ${filters.expiryDaysMax} days`)
    }
  }

  if (filters.sortBy) {
    const orderText = filters.sortOrder === 'asc' ? 'lowest' : 'highest'
    parts.push(`sorted by ${orderText} ${filters.sortBy}`)
  }

  if (filters.limit) {
    parts.push(`showing ${filters.limit} results`)
  }

  if (filters.searchTerm) {
    parts.push(`matching "${filters.searchTerm}"`)
  }

  return parts.length > 0 ? `Filtering: ${parts.join(', ')}` : 'No filters applied'
}
