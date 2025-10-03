'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  BellRing,
  Clock,
  Shield,
  TrendingUp,
  AlertTriangle,
  Settings,
  X,
  Check
} from 'lucide-react'
import { domaClient } from '@/lib/doma-client'
import { ScoringEngine } from '@/lib/scoring'

const scoringEngine = new ScoringEngine()

interface Alert {
  id: string
  type: 'expiry' | 'risk' | 'momentum' | 'value' | 'offer'
  title: string
  message: string
  severity: 'low' | 'medium' | 'high'
  domainName: string
  tokenId?: string // Auto-generated alerts
  domainId?: string // Manual alerts from domain detail page
  timestamp?: Date // Auto-generated alerts
  createdAt?: string // Manual alerts from domain detail page
  read: boolean
  actionRequired: boolean
  dismissed?: boolean
}

interface AlertRule {
  id: string
  name: string
  type: 'expiry' | 'risk' | 'momentum' | 'value' | 'offer'
  condition: string
  threshold: number
  enabled: boolean
  notificationMethod: 'browser' | 'email' | 'both'
}

interface TrackedDomain {
  tokenId: string
  domainName: string
  addedAt: Date
  lastChecked?: Date
  lastOfferCount?: number
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [trackedDomains, setTrackedDomains] = useState<TrackedDomain[]>([])
  const [showNewRuleModal, setShowNewRuleModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAlertsAndRules()
    requestNotificationPermission()
  }, [])

  const loadAlertsAndRules = async () => {
    setIsLoading(true)

    try {
      console.log('[Alerts] Starting to load alerts and rules...')
      // Load existing alert rules from localStorage
      const savedRules = localStorage.getItem('dometrics-alert-rules')
      const rules = savedRules ? JSON.parse(savedRules) : getDefaultAlertRules()
      setAlertRules(rules)

      // Load tracked domains
      const savedTracked = localStorage.getItem('dometrics-tracked-domains')
      const tracked: TrackedDomain[] = savedTracked ? JSON.parse(savedTracked) : []
      setTrackedDomains(tracked)

      // Load existing alerts from localStorage
      const savedAlerts = localStorage.getItem('dometrics-alerts')
      const existingAlerts: Alert[] = savedAlerts
        ? JSON.parse(savedAlerts).map((a: any) => ({
            ...a,
            // Handle both timestamp (auto-generated) and createdAt (manual) formats
            timestamp: a.timestamp ? new Date(a.timestamp) : undefined,
            // Convert manual alerts to have proper fields for display
            title: a.title || `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} Alert`,
            message: a.message || `Alert for ${a.domainName}`,
            severity: a.severity || 'low',
            read: a.read ?? false,
            actionRequired: a.actionRequired ?? false
          }))
        : []

      // Fetch offer counts for all tracked domains upfront
      const offerCounts = new Map<string, number>()
      await Promise.all(
        tracked.map(async (trackedDomain) => {
          try {
            const offers = await domaClient.getTokenOffers(trackedDomain.tokenId, 10)
            offerCounts.set(trackedDomain.tokenId, offers?.length || 0)
          } catch (error) {
            console.error(`Error fetching offers for ${trackedDomain.tokenId}:`, error)
            offerCounts.set(trackedDomain.tokenId, 0)
          }
        })
      )

      // Generate new alerts based on real domain data
      const names = await domaClient.getAllNames(50)
      const generatedAlerts: Alert[] = []

      for (const name of names) {
        if (!name.tokens || name.tokens.length === 0) continue
        
        for (const token of name.tokens) {
          const parts = name.name.split('.')
          const namePart = parts[0]
          const tld = parts.slice(1).join('.') || 'com'
          
          const daysUntilExpiry = Math.floor(
            (new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )

          const scores = scoringEngine.calculateScoresSync({
            name: namePart,
            tld,
            expiresAt: new Date(token.expiresAt),
            lockStatus: name.transferLock || false,
            registrarId: name.registrar?.ianaId ? parseInt(name.registrar.ianaId) : 1,
            renewalCount: 0, // Real renewal count not available from API
            offerCount: 0, // Real offer count would come from API
            activity7d: 0, // Real activity would come from API
            activity30d: 0, // Real activity would come from API
          })

          // Check against alert rules
          rules.forEach((rule: AlertRule) => {
            if (!rule.enabled) return

            let shouldAlert = false
            let alertMessage = ''
            let severity: 'low' | 'medium' | 'high' = 'low'

            switch (rule.type) {
              case 'expiry':
                if (daysUntilExpiry <= rule.threshold) {
                  shouldAlert = true
                  alertMessage = `Domain expires in ${daysUntilExpiry} days`
                  severity = daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 30 ? 'medium' : 'low'
                }
                break
              case 'risk':
                if (scores.risk >= rule.threshold) {
                  shouldAlert = true
                  alertMessage = `High risk score detected: ${scores.risk}/100`
                  severity = scores.risk >= 80 ? 'high' : 'medium'
                }
                break
              case 'momentum':
                if (scores.momentum >= rule.threshold) {
                  shouldAlert = true
                  alertMessage = `High momentum detected: ${scores.momentum}/100`
                  severity = 'medium'
                }
                break
              case 'value':
                const estimatedValue = Math.round(scores.currentValue || 1000)
                if (estimatedValue >= rule.threshold) {
                  shouldAlert = true
                  alertMessage = `Value milestone reached: $${estimatedValue.toLocaleString()}`
                  severity = 'low'
                }
                break
              case 'offer':
                // Check if this domain is tracked and has new offers
                const trackedDomain = tracked.find(d => d.tokenId === token.tokenId)
                if (trackedDomain && rule.enabled) {
                  const currentOfferCount = offerCounts.get(token.tokenId) || 0

                  if (trackedDomain.lastOfferCount !== undefined && currentOfferCount > trackedDomain.lastOfferCount) {
                    const newOffersCount = currentOfferCount - trackedDomain.lastOfferCount
                    shouldAlert = true
                    alertMessage = `${newOffersCount} new offer${newOffersCount > 1 ? 's' : ''} received`
                    severity = 'medium'

                    // Update tracked domain's last offer count
                    trackedDomain.lastOfferCount = currentOfferCount
                    trackedDomain.lastChecked = new Date()
                  } else if (trackedDomain.lastOfferCount === undefined) {
                    // First time checking, just store the count
                    trackedDomain.lastOfferCount = currentOfferCount
                    trackedDomain.lastChecked = new Date()
                  }
                }
                break
            }

            if (shouldAlert) { // Show all alerts that meet criteria
              generatedAlerts.push({
                id: `alert-${token.tokenId}-${rule.type}`,
                type: rule.type,
                title: rule.name,
                message: alertMessage,
                severity,
                domainName: name.name,
                tokenId: token.tokenId,
                timestamp: new Date(), // Current time for new alerts
                read: false, // New alerts are unread
                actionRequired: severity === 'high'
              })
            }
          })
        }
      }

      // Merge new alerts with existing alerts (preserve read/dismissed state)
      const alertMap = new Map<string, Alert>()

      // Add existing alerts first (with their read/dismissed state)
      existingAlerts.forEach(alert => {
        if (!alert.dismissed) {
          alertMap.set(alert.id, alert)
        }
      })

      // Add new alerts (only if they don't already exist)
      generatedAlerts.forEach(alert => {
        if (!alertMap.has(alert.id)) {
          alertMap.set(alert.id, alert)
        }
      })

      // Convert to array and sort
      const mergedAlerts = Array.from(alertMap.values())
      mergedAlerts.sort((a, b) => {
        const timeA = a.timestamp?.getTime() || (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const timeB = b.timestamp?.getTime() || (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        return timeB - timeA
      })

      // Save to localStorage
      localStorage.setItem('dometrics-alerts', JSON.stringify(mergedAlerts.slice(0, 50)))

      // Save updated tracked domains
      localStorage.setItem('dometrics-tracked-domains', JSON.stringify(tracked))

      setAlerts(mergedAlerts.slice(0, 50)) // Show up to 50 alerts
      console.log('[Alerts] Successfully loaded', mergedAlerts.length, 'alerts')
    } catch (error) {
      console.error('[Alerts] Error loading alerts:', error)
      setAlerts([]) // Set empty array on error so page still renders
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultAlertRules = (): AlertRule[] => [
    {
      id: 'expiry-30',
      name: 'Expiry Warning (30 days)',
      type: 'expiry',
      condition: 'expires_within',
      threshold: 30,
      enabled: true,
      notificationMethod: 'browser'
    },
    {
      id: 'expiry-7',
      name: 'Expiry Critical (7 days)',
      type: 'expiry',
      condition: 'expires_within',
      threshold: 7,
      enabled: true,
      notificationMethod: 'both'
    },
    {
      id: 'risk-high',
      name: 'High Risk Score',
      type: 'risk',
      condition: 'greater_than',
      threshold: 70,
      enabled: true,
      notificationMethod: 'browser'
    },
    {
      id: 'momentum-hot',
      name: 'High Momentum',
      type: 'momentum',
      condition: 'greater_than',
      threshold: 75,
      enabled: false,
      notificationMethod: 'browser'
    },
    {
      id: 'offer-new',
      name: 'New Offer on Tracked Domain',
      type: 'offer',
      condition: 'new_offer',
      threshold: 1,
      enabled: true,
      notificationMethod: 'both'
    }
  ]

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  const markAsRead = (alertId: string) => {
    setAlerts(prev => {
      const updated = prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
      localStorage.setItem('dometrics-alerts', JSON.stringify(updated))
      return updated
    })
  }

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => {
      const updated = prev.map(alert =>
        alert.id === alertId ? { ...alert, dismissed: true } : alert
      ).filter(alert => !alert.dismissed)
      localStorage.setItem('dometrics-alerts', JSON.stringify(updated))
      return updated
    })
  }

  const toggleAlertRule = (ruleId: string) => {
    const updatedRules = alertRules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    )
    setAlertRules(updatedRules)
    localStorage.setItem('dometrics-alert-rules', JSON.stringify(updatedRules))
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'expiry': return <Clock className="w-4 h-4" />
      case 'risk': return <AlertTriangle className="w-4 h-4" />
      case 'momentum': return <TrendingUp className="w-4 h-4" />
      case 'value': return <Shield className="w-4 h-4" />
      case 'offer': return <span className="text-base">💰</span>
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
    }
  }

  const unreadCount = alerts.filter(alert => !alert.read).length
  const criticalCount = alerts.filter(alert => alert.severity === 'high' && !alert.read).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Alerts</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Stats */}
        {(unreadCount > 0 || criticalCount > 0) && (
          <div className="mb-6 flex gap-4">
            {unreadCount > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
                <BellRing className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Click alerts to mark as read
                  </p>
                </div>
              </div>
            )}
            
            {criticalCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    {criticalCount} critical alert{criticalCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Immediate action required
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'alerts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Active Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rules'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Alert Rules ({alertRules.filter(r => r.enabled).length} active)
            </button>
          </nav>
        </div>

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No alerts</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">All your domains are looking good!</p>
                <div className="mt-6 max-w-md mx-auto">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                      How to set up alerts:
                    </p>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 text-left space-y-1.5">
                      <li>1. Navigate to any domain detail page</li>
                      <li>2. Click the "Set Alert" button</li>
                      <li>3. Choose your alert conditions</li>
                      <li>4. Get notified when conditions are met</li>
                    </ol>
                  </div>
                  <Link
                    href="/"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Browse Domains
                  </Link>
                </div>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 p-6 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                    alert.read ? 'opacity-75' : ''
                  } ${
                    alert.severity === 'high'
                      ? 'border-red-500'
                      : alert.severity === 'medium'
                      ? 'border-yellow-500'
                      : 'border-blue-500'
                  }`}
                  onClick={() => markAsRead(alert.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {alert.title}
                          </h3>
                          {!alert.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                          {alert.actionRequired && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded">
                              Action Required
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <Link
                            href={`/domain/${alert.tokenId || alert.domainId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {alert.domainName}
                          </Link>
                          {alert.type !== 'offer' && (
                            <>
                              <span>•</span>
                              {(() => {
                                const date = alert.timestamp || (alert.createdAt ? new Date(alert.createdAt) : null)
                                return date ? (
                                  <>
                                    <span>{date.toLocaleDateString()}</span>
                                    <span>{date.toLocaleTimeString()}</span>
                                  </>
                                ) : null
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissAlert(alert.id)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alert Rules</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure when you want to be notified about domain events
              </p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {alertRules.map((rule) => (
                <div key={rule.id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        rule.enabled 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {rule.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {rule.type === 'offer'
                        ? 'Alert when new offers are received on tracked domains'
                        : `Alert when ${rule.type} ${rule.condition.replace('_', ' ')} ${rule.threshold}${
                            rule.type === 'expiry' ? ' days' : rule.type === 'value' ? ' USD' : '%'
                          }`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {rule.notificationMethod === 'both' ? 'Browser + Email' : 
                       rule.notificationMethod === 'email' ? 'Email' : 'Browser'}
                    </span>
                    <button
                      onClick={() => toggleAlertRule(rule.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        rule.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}