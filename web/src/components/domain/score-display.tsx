'use client'

import { motion } from 'framer-motion'
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, getScoreColor } from '@/lib/utils'
import { ScoreFactor } from '@/lib/scoring'
import * as Tooltip from '@radix-ui/react-tooltip'

interface ScoreDisplayProps {
  label: string
  value: number
  type: 'risk' | 'rarity' | 'momentum' | 'forecast'
  factors?: ScoreFactor[]
  previousValue?: number
  confidenceInterval?: { low: number; high: number }
}

export function ScoreDisplay({ 
  label, 
  value, 
  type, 
  factors, 
  previousValue,
  confidenceInterval 
}: ScoreDisplayProps) {
  const trend = previousValue !== undefined ? value - previousValue : 0
  const trendIcon = trend > 0 ? <TrendingUp className="w-4 h-4" /> : 
                    trend < 0 ? <TrendingDown className="w-4 h-4" /> : 
                    <Minus className="w-4 h-4" />

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </h3>
          {factors && factors.length > 0 && (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-900 text-white p-3 rounded-lg shadow-xl max-w-xs z-50"
                    sideOffset={5}
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold mb-2">Top Contributing Factors:</p>
                      {factors.map((factor, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{factor.name}</span>
                            <span className="text-gray-300">
                              {factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-gray-400 mt-1">{factor.description}</p>
                        </div>
                      ))}
                    </div>
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>

        {/* Score Display */}
        <div className="flex items-end gap-3">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={cn(
              "text-4xl font-bold tabular-nums",
              getScoreColor(value, type)
            )}
          >
            {value}
          </motion.div>
          <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">/100</span>
        </div>

        {/* Confidence Interval */}
        {confidenceInterval && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            CI: {confidenceInterval.low.toFixed(0)} - {confidenceInterval.high.toFixed(0)}
          </div>
        )}

        {/* Trend */}
        {previousValue !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-sm",
              trend > 0 ? "text-green-600 dark:text-green-400" :
              trend < 0 ? "text-red-600 dark:text-red-400" :
              "text-gray-500 dark:text-gray-400"
            )}>
              {trendIcon}
              <span className="font-medium">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              vs yesterday
            </span>
          </div>
        )}

        {/* Visual Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-3 rounded-full",
                type === 'risk' ? 
                  value < 25 ? "bg-gradient-to-r from-green-400 to-green-500" :
                  value < 50 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" :
                  value < 75 ? "bg-gradient-to-r from-orange-400 to-orange-500" :
                  "bg-gradient-to-r from-red-400 to-red-500" :
                  value >= 75 ? "bg-gradient-to-r from-green-400 to-green-500" :
                  value >= 50 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                  value >= 25 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" :
                  "bg-gradient-to-r from-gray-400 to-gray-500"
              )}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}