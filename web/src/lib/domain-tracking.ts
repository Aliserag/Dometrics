// Domain tracking utilities for alerts

export interface TrackedDomain {
  tokenId: string
  domainName: string
  addedAt: Date
  lastChecked?: Date
  lastOfferCount?: number
}

const STORAGE_KEY = 'dometrics-tracked-domains'

export function getTrackedDomains(): TrackedDomain[] {
  if (typeof window === 'undefined') return []

  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return []

  return JSON.parse(saved).map((d: any) => ({
    ...d,
    addedAt: new Date(d.addedAt),
    lastChecked: d.lastChecked ? new Date(d.lastChecked) : undefined
  }))
}

export function trackDomain(tokenId: string, domainName: string): void {
  const tracked = getTrackedDomains()

  // Don't add duplicates
  if (tracked.some(d => d.tokenId === tokenId)) {
    return
  }

  tracked.push({
    tokenId,
    domainName,
    addedAt: new Date(),
    lastOfferCount: undefined
  })

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracked))
}

export function untrackDomain(tokenId: string): void {
  const tracked = getTrackedDomains()
  const filtered = tracked.filter(d => d.tokenId !== tokenId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function isTracked(tokenId: string): boolean {
  const tracked = getTrackedDomains()
  return tracked.some(d => d.tokenId === tokenId)
}

export function getTrackedCount(): number {
  return getTrackedDomains().length
}
