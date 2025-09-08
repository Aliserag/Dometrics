'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, Lock, TrendingUp, Sparkles, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDate, getDaysUntil, getScoreBadgeColor } from '@/lib/utils'
import { DomainScores } from '@/lib/scoring'
import Link from 'next/link'

interface DomainCardProps {
  domain: {
    id: string
    name: string
    tld: string
    tokenId: string
    tokenAddress: string
    ownerAddress: string
    expiresAt: string
    lockStatus?: boolean
  }
  scores?: DomainScores
  onSelect?: () => void
}

export function DomainCard({ domain, scores, onSelect }: DomainCardProps) {
  const daysUntilExpiry = getDaysUntil(domain.expiresAt)
  const fullName = `${domain.name}.${domain.tld}`

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700"
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {fullName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Token #{domain.tokenId.slice(0, 8)}...
                </span>
                {domain.lockStatus && (
                  <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`https://explorer-testnet.doma.xyz/token/${domain.tokenAddress}?tokenId=${domain.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowUpRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {/* Expiry Status */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Expires</span>
              <span className={cn(
                "text-sm font-medium flex items-center gap-1",
                daysUntilExpiry < 30 ? "text-red-600 dark:text-red-400" :
                daysUntilExpiry < 90 ? "text-yellow-600 dark:text-yellow-400" :
                "text-green-600 dark:text-green-400"
              )}>
                <Clock className="w-3 h-3" />
                {daysUntilExpiry} days
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  daysUntilExpiry < 30 ? "bg-red-500" :
                  daysUntilExpiry < 90 ? "bg-yellow-500" :
                  "bg-green-500"
                )}
                style={{ width: `${Math.min(100, (daysUntilExpiry / 365) * 100)}%` }}
              />
            </div>
          </div>

          {/* Scores */}
          {scores && (
            <div className="grid grid-cols-2 gap-3">
              <ScoreBadge
                label="Risk"
                value={scores.risk}
                type="risk"
                icon={<AlertCircle className="w-3 h-3" />}
              />
              <ScoreBadge
                label="Rarity"
                value={scores.rarity}
                type="rarity"
                icon={<Sparkles className="w-3 h-3" />}
              />
              <ScoreBadge
                label="Momentum"
                value={scores.momentum}
                type="momentum"
                icon={<TrendingUp className="w-3 h-3" />}
              />
              <ScoreBadge
                label="Forecast"
                value={scores.forecast}
                type="forecast"
                icon={<TrendingUp className="w-3 h-3" />}
              />
            </div>
          )}

          {/* Owner */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Owner</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {domain.ownerAddress.slice(0, 6)}...{domain.ownerAddress.slice(-4)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface ScoreBadgeProps {
  label: string
  value: number
  type: 'risk' | 'rarity' | 'momentum' | 'forecast'
  icon: React.ReactNode
}

function ScoreBadge({ label, value, type, icon }: ScoreBadgeProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg",
      getScoreBadgeColor(value, type)
    )}>
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  )
}