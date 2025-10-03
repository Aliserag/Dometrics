/**
 * AI-powered domain valuation using DeepSeek API
 */

interface AIValuationResponse {
  currentValue: number
  projectedValue: number
  confidence: number
  keywordAnalysis: {
    keywords: string[]
    category: string
    brandability: number
    memorability: number
    commercialValue: number
  }
  factors: Array<{
    name: string
    value: number
    weight: number
    contribution: number
    description: string
  }>
  reasoning: string
}

export interface DomainAnalysis {
  summary: string
  investment_outlook: 'excellent' | 'good' | 'fair' | 'poor' | 'high-risk'
  key_strengths: string[]
  key_risks: string[]
  recommendation: string
  confidence_level: number
}

export class AIValuationService {
  private apiKey: string
  private baseUrl = 'https://api.deepseek.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!this.apiKey) {
      console.warn('DeepSeek API key not found - AI valuation will be disabled')
    }
  }

  async evaluateDomain(
    domainName: string, 
    tld: string, 
    marketData: {
      daysUntilExpiry: number
      offerCount: number
      activity30d: number
      registrar: string
      transferLock: boolean
    }
  ): Promise<AIValuationResponse> {
    if (!this.apiKey) {
      return this.getFallbackValuation(domainName, tld, marketData)
    }

    try {
      const prompt = this.buildValuationPrompt(domainName, tld, marketData)
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert domain appraiser with deep knowledge of domain values, market trends, branding, SEO value, and commercial potential. Provide detailed, accurate domain valuations in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Parse the AI response (expecting JSON)
      const parsedResponse = this.parseAIResponse(aiResponse)
      return this.validateAndNormalizeResponse(parsedResponse, domainName, tld)

    } catch (error) {
      console.error('AI valuation error:', error)
      return this.getFallbackValuation(domainName, tld, marketData)
    }
  }

  async analyzeDomain(
    domainName: string,
    tld: string,
    scores: {
      risk: number
      rarity: number
      momentum: number
      currentValue: number
      projectedValue: number
    },
    marketData: {
      daysUntilExpiry: number
      offerCount: number
      activity30d: number
      registrar: string
      transferLock: boolean
    }
  ): Promise<DomainAnalysis> {
    if (!this.apiKey) {
      return this.getFallbackAnalysis(domainName, tld, scores, marketData)
    }

    try {
      const prompt = this.buildAnalysisPrompt(domainName, tld, scores, marketData)

      // Add 8 second timeout for faster fallback
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a professional domain trader analyzing investment opportunities. Be concise, direct, and focus on profitability metrics. Always respond in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500,
          stream: false,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      const parsedAnalysis = this.parseAnalysisResponse(aiResponse)
      return this.validateAnalysisResponse(parsedAnalysis, domainName, tld, scores, marketData)

    } catch (error) {
      console.error('AI analysis error:', error)
      return this.getFallbackAnalysis(domainName, tld, scores, marketData)
    }
  }

  private buildAnalysisPrompt(
    domainName: string,
    tld: string,
    scores: any,
    marketData: any
  ): string {
    const projectedGain = scores.projectedValue - scores.currentValue
    const projectedROI = ((projectedGain / scores.currentValue) * 100).toFixed(1)

    return `Domain: ${domainName}.${tld}
Risk: ${scores.risk}/100 | Rarity: ${scores.rarity}/100 | Momentum: ${scores.momentum}/100
Current: $${scores.currentValue.toLocaleString()} → Projected: $${scores.projectedValue.toLocaleString()} (${projectedROI}% ROI)
Expiry: ${marketData.daysUntilExpiry}d | Activity: ${marketData.offerCount} offers
TLD: .${tld} | Length: ${domainName.length} chars

As a domain trader, analyze profit potential. Return ONLY valid JSON:
{
  "summary": "1-2 sentence trade summary focusing on profit/loss potential",
  "investment_outlook": "excellent|good|fair|poor|high-risk",
  "key_strengths": ["max 3 strengths focused on value/resale"],
  "key_risks": ["max 3 risks affecting profitability"],
  "recommendation": "BUY/HOLD/SELL with price target",
  "confidence_level": 70
}

Focus on: resale value, profit margins, market liquidity, exit strategy, price trends.`
  }

  private parseAnalysisResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON found in analysis response')
    } catch (error) {
      console.error('Failed to parse analysis response:', error)
      throw error
    }
  }

  private validateAnalysisResponse(
    response: any,
    domainName: string,
    tld: string,
    scores: any,
    marketData: any
  ): DomainAnalysis {
    return {
      summary: response.summary || `${domainName}.${tld} shows mixed signals with moderate investment potential.`,
      investment_outlook: response.investment_outlook || 'fair',
      key_strengths: response.key_strengths || ['Domain has basic commercial potential'],
      key_risks: response.key_risks || ['Market uncertainty', 'Valuation challenges'],
      recommendation: response.recommendation || 'Consider market conditions before investing.',
      confidence_level: Math.min(95, Math.max(50, response.confidence_level || 70))
    }
  }

  getFallbackAnalysis(
    domainName: string,
    tld: string,
    scores: any,
    marketData: any
  ): DomainAnalysis {
    let outlook: DomainAnalysis['investment_outlook'] = 'fair'
    let summary = ''
    const strengths: string[] = []
    const risks: string[] = []

    // Determine outlook based on scores
    if (scores.risk < 30 && scores.rarity > 70) {
      outlook = 'excellent'
      summary = `${domainName}.${tld} presents an excellent investment opportunity with low risk and high rarity.`
    } else if (scores.risk < 50 && scores.rarity > 50) {
      outlook = 'good'
      summary = `${domainName}.${tld} shows good potential with manageable risk and solid value characteristics.`
    } else if (scores.risk > 70) {
      outlook = 'high-risk'
      summary = `${domainName}.${tld} carries significant risk factors that require careful consideration.`
    } else {
      outlook = 'fair'
      summary = `${domainName}.${tld} presents a moderate investment opportunity with standard market characteristics.`
    }

    // Add strengths
    if (domainName.length <= 6) strengths.push('Short, memorable domain name')
    if (scores.rarity > 60) strengths.push('Above-average rarity score')
    if (scores.momentum > 60) strengths.push('Strong market momentum')
    if (tld === 'com') strengths.push('Premium .com extension')
    if (marketData.offerCount > 3) strengths.push('Active market interest')

    // Add risks
    if (marketData.daysUntilExpiry < 90) risks.push('Approaching expiration date')
    if (scores.risk > 60) risks.push('High risk score requires attention')
    if (marketData.transferLock) risks.push('Transfer restrictions in place')
    if (marketData.activity30d < 5) risks.push('Limited recent market activity')

    return {
      summary,
      investment_outlook: outlook,
      key_strengths: strengths.length > 0 ? strengths : ['Basic domain characteristics'],
      key_risks: risks.length > 0 ? risks : ['Standard market risks'],
      recommendation: outlook === 'excellent' ? 'Strong buy recommendation' :
                     outlook === 'good' ? 'Consider acquiring if price is reasonable' :
                     outlook === 'high-risk' ? 'Proceed with extreme caution' :
                     'Monitor for better opportunities',
      confidence_level: 65
    }
  }

  private buildValuationPrompt(
    domainName: string, 
    tld: string, 
    marketData: any
  ): string {
    return `
Please provide a comprehensive valuation for the domain "${domainName}.${tld}".

Domain Details:
- Full domain: ${domainName}.${tld}
- Name part: ${domainName}
- TLD: .${tld}
- Days until expiry: ${marketData.daysUntilExpiry}
- Recent offers: ${marketData.offerCount}
- 30-day activity: ${marketData.activity30d}
- Registrar: ${marketData.registrar}
- Transfer locked: ${marketData.transferLock}

Please analyze and provide a JSON response with the following structure:
{
  "currentValue": number (estimated current USD value),
  "projectedValue": number (6-month projected USD value),
  "confidence": number (0-100, confidence in valuation),
  "keywordAnalysis": {
    "keywords": ["array", "of", "relevant", "keywords"],
    "category": "string (e.g., tech, finance, generic, brandable, etc.)",
    "brandability": number (0-100),
    "memorability": number (0-100),
    "commercialValue": number (0-100)
  },
  "factors": [
    {
      "name": "Length Premium",
      "value": ${domainName.length},
      "weight": 0.25,
      "contribution": number,
      "description": "Impact of domain length on value"
    },
    {
      "name": "Keyword Value",
      "value": number,
      "weight": 0.35,
      "contribution": number,
      "description": "Commercial value of keywords/brandability"
    },
    {
      "name": "TLD Premium",
      "value": number,
      "weight": 0.20,
      "contribution": number,
      "description": "Value impact of .${tld} extension"
    },
    {
      "name": "Market Factors",
      "value": number,
      "weight": 0.20,
      "contribution": number,
      "description": "Market activity and demand signals"
    }
  ],
  "reasoning": "Brief explanation of the valuation rationale"
}

Consider these factors in your analysis:
1. Domain length (shorter is typically more valuable)
2. Keyword relevance and commercial potential
3. Brandability and memorability
4. TLD value (.com premium, niche TLD relevance)
5. Market trends and comparable sales
6. SEO potential and search volume
7. Industry relevance and commercial use cases
8. Linguistic factors (easy to pronounce/spell)
9. Current market activity and interest
10. Risk factors (expiry, transfer restrictions)

Base your valuation on real-world domain market knowledge and comparable sales data.
`
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON found in response')
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw error
    }
  }

  private validateAndNormalizeResponse(
    response: any, 
    domainName: string, 
    tld: string
  ): AIValuationResponse {
    // Ensure required fields exist with sensible defaults
    return {
      currentValue: Math.max(100, response.currentValue || 1000),
      projectedValue: Math.max(100, response.projectedValue || response.currentValue * 1.1),
      confidence: Math.min(95, Math.max(50, response.confidence || 75)),
      keywordAnalysis: {
        keywords: response.keywordAnalysis?.keywords || [domainName],
        category: response.keywordAnalysis?.category || 'generic',
        brandability: Math.min(100, Math.max(0, response.keywordAnalysis?.brandability || 50)),
        memorability: Math.min(100, Math.max(0, response.keywordAnalysis?.memorability || 50)),
        commercialValue: Math.min(100, Math.max(0, response.keywordAnalysis?.commercialValue || 50))
      },
      factors: response.factors || this.getDefaultFactors(domainName, tld),
      reasoning: response.reasoning || 'AI-powered valuation based on domain characteristics and market factors.'
    }
  }

  private getFallbackValuation(
    domainName: string, 
    tld: string, 
    marketData: any
  ): AIValuationResponse {
    // Fallback to algorithm-based valuation when AI is unavailable
    const baseValue = 100
    const lengthMultiplier = domainName.length <= 4 ? 10 : domainName.length <= 7 ? 3 : 1
    const tldMultiplier = tld === 'com' ? 2 : tld === 'ai' ? 1.5 : 1
    
    const currentValue = Math.max(100, baseValue * lengthMultiplier * tldMultiplier)
    const projectedValue = currentValue * (1 + (marketData.offerCount || 0) * 0.1)

    return {
      currentValue,
      projectedValue,
      confidence: 60,
      keywordAnalysis: {
        keywords: [domainName],
        category: 'generic',
        brandability: domainName.length <= 7 ? 70 : 40,
        memorability: domainName.length <= 6 ? 80 : 50,
        commercialValue: tld === 'com' ? 70 : 50
      },
      factors: this.getDefaultFactors(domainName, tld),
      reasoning: 'Algorithmic fallback valuation based on basic domain characteristics.'
    }
  }

  private getDefaultFactors(domainName: string, tld: string) {
    return [
      {
        name: 'Length Premium',
        value: domainName.length,
        weight: 0.25,
        contribution: domainName.length <= 4 ? 500 : domainName.length <= 7 ? 200 : 0,
        description: `${domainName.length} character domain name`
      },
      {
        name: 'TLD Value',
        value: tld === 'com' ? 100 : tld === 'ai' ? 75 : 50,
        weight: 0.25,
        contribution: tld === 'com' ? 300 : tld === 'ai' ? 150 : 0,
        description: `.${tld} extension value`
      }
    ]
  }
}

// Create singleton instance
export const aiValuationService = new AIValuationService()