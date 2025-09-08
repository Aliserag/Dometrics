import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

export function getDaysUntil(date: string | Date): number {
  const target = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getScoreColor(score: number, type: 'risk' | 'rarity' | 'momentum' | 'forecast'): string {
  if (type === 'risk') {
    if (score < 25) return 'text-green-500'
    if (score < 50) return 'text-yellow-500'
    if (score < 75) return 'text-orange-500'
    return 'text-red-500'
  }
  
  // For rarity, momentum, forecast - higher is better
  if (score >= 75) return 'text-green-500'
  if (score >= 50) return 'text-blue-500'
  if (score >= 25) return 'text-yellow-500'
  return 'text-gray-500'
}

export function getScoreBadgeColor(score: number, type: 'risk' | 'rarity' | 'momentum' | 'forecast'): string {
  if (type === 'risk') {
    if (score < 25) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (score < 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    if (score < 75) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
  
  // For rarity, momentum, forecast - higher is better
  if (score >= 75) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (score >= 50) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (score >= 25) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}