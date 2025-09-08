'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Code, 
  Copy, 
  Check,
  ExternalLink,
  Book,
  Zap,
  Shield,
  Globe,
  Database
} from 'lucide-react'

export default function APIDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const endpoints = [
    {
      method: 'GET',
      path: '/api/domains',
      description: 'Get all tracked domains with scores',
      parameters: [
        { name: 'limit', type: 'number', default: '25', description: 'Number of results to return' },
        { name: 'tld', type: 'string', optional: true, description: 'Filter by TLD (e.g., "com", "xyz")' },
        { name: 'minRisk', type: 'number', optional: true, description: 'Minimum risk score (0-100)' },
        { name: 'maxRisk', type: 'number', optional: true, description: 'Maximum risk score (0-100)' },
      ],
      example: `curl -X GET "https://dometrics.vercel.app/api/domains?limit=10&tld=com" \\
  -H "Content-Type: application/json"`
    },
    {
      method: 'GET',
      path: '/api/domains/{tokenId}',
      description: 'Get detailed information for a specific domain',
      parameters: [
        { name: 'tokenId', type: 'string', description: 'The token ID of the domain' }
      ],
      example: `curl -X GET "https://dometrics.vercel.app/api/domains/1001" \\
  -H "Content-Type: application/json"`
    },
    {
      method: 'GET',
      path: '/api/analytics/tlds',
      description: 'Get TLD performance analytics',
      parameters: [
        { name: 'timeRange', type: 'string', default: '30d', description: 'Time range: 7d, 30d, or 90d' }
      ],
      example: `curl -X GET "https://dometrics.vercel.app/api/analytics/tlds?timeRange=7d" \\
  -H "Content-Type: application/json"`
    },
    {
      method: 'POST',
      path: '/api/alerts',
      description: 'Create a new alert rule',
      parameters: [
        { name: 'name', type: 'string', description: 'Name for the alert rule' },
        { name: 'type', type: 'string', description: 'Alert type: expiry, risk, momentum, or value' },
        { name: 'threshold', type: 'number', description: 'Threshold value to trigger alert' },
        { name: 'condition', type: 'string', description: 'Condition: greater_than, less_than, or equals' },
      ],
      example: `curl -X POST "https://dometrics.vercel.app/api/alerts" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "High Risk Domains",
    "type": "risk",
    "threshold": 75,
    "condition": "greater_than"
  }'`
    }
  ]

  const responseExamples = {
    domains: `{
  "data": [
    {
      "id": "1001",
      "name": "crypto.xyz",
      "tokenId": "1001",
      "tokenAddress": "0x...",
      "owner": "0x742d35Cc...",
      "expiresAt": "2025-03-15T00:00:00.000Z",
      "scores": {
        "risk": 35,
        "rarity": 78,
        "momentum": 65,
        "forecast": 82,
        "explainers": {
          "risk": [
            {
              "name": "Expiry Buffer",
              "value": 165,
              "contribution": 15.75,
              "description": "165 days until expiration"
            }
          ]
        }
      },
      "daysUntilExpiry": 165,
      "registrar": "GoDaddy",
      "value": 5000
    }
  ],
  "total": 247,
  "page": 1,
  "limit": 25
}`,
    domain: `{
  "data": {
    "id": "1001",
    "name": "crypto.xyz",
    "tokenId": "1001",
    "tokenAddress": "0x...",
    "owner": "0x742d35Cc...",
    "expiresAt": "2025-03-15T00:00:00.000Z",
    "scores": {
      "risk": 35,
      "rarity": 78,
      "momentum": 65,
      "forecast": 82,
      "forecastLow": 74,
      "forecastHigh": 90,
      "explainers": {
        "risk": [
          {
            "name": "Expiry Buffer",
            "value": 165,
            "weight": 0.45,
            "contribution": 15.75,
            "description": "165 days until expiration"
          },
          {
            "name": "Lock Status",
            "value": 0,
            "weight": 0.25,
            "contribution": 0,
            "description": "Domain is unlocked"
          }
        ],
        "rarity": [
          {
            "name": "Name Length",
            "value": 6,
            "weight": 0.40,
            "contribution": 20,
            "description": "6 characters"
          }
        ]
      }
    },
    "activity": {
      "7d": 15,
      "30d": 42,
      "transfers": 3,
      "offers": 5
    },
    "registrar": "GoDaddy",
    "transferLock": false,
    "value": 5000,
    "explorerUrl": "https://explorer-testnet.doma.xyz/token/0x.../1001"
  }
}`
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
                <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">API Documentation</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://docs.doma.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Doma Docs
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Dometrics API
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-3xl mx-auto">
            Access domain analytics, scoring data, and alerts programmatically. Built on top of the Doma Protocol Subgraph for real-time domain intelligence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
              <Zap className="w-4 h-4" />
              Real-time Data
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
              <Shield className="w-4 h-4" />
              No Auth Required
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm">
              <Globe className="w-4 h-4" />
              CORS Enabled
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Start</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started with the Dometrics API in minutes. All endpoints return JSON and support CORS.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 relative">
            <button
              onClick={() => copyToClipboard('curl -X GET "https://dometrics.vercel.app/api/domains?limit=5" -H "Content-Type: application/json"', 'quickstart')}
              className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {copiedCode === 'quickstart' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
{`# Get the top 5 domains with analytics
curl -X GET "https://dometrics.vercel.app/api/domains?limit=5" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </div>

        {/* Base URL */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Base URL</h3>
          </div>
          <code className="text-blue-800 dark:text-blue-200 font-mono">
            https://dometrics.vercel.app/api
          </code>
        </div>

        {/* Endpoints */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Endpoints</h2>
          
          {endpoints.map((endpoint, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    endpoint.method === 'GET' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-lg font-mono text-gray-900 dark:text-white">
                    {endpoint.path}
                  </code>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{endpoint.description}</p>
              </div>

              {/* Parameters */}
              {endpoint.parameters.length > 0 && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Parameters</h4>
                  <div className="space-y-2">
                    {endpoint.parameters.map((param, paramIndex) => (
                      <div key={paramIndex} className="flex items-start gap-4 text-sm">
                        <code className="font-mono text-blue-600 dark:text-blue-400 min-w-0 flex-shrink-0">
                          {param.name}
                        </code>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          'optional' in param && param.optional 
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {'optional' in param && param.optional ? 'optional' : 'required'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">({param.type})</span>
                        <span className="text-gray-600 dark:text-gray-400 flex-1">{param.description}</span>
                        {'default' in param && param.default && (
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            default: {param.default}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Example Request</h4>
                  <button
                    onClick={() => copyToClipboard(endpoint.example, `example-${index}`)}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {copiedCode === `example-${index}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                    {endpoint.example}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Response Examples */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Response Examples</h2>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">GET /api/domains</h3>
                  <button
                    onClick={() => copyToClipboard(responseExamples.domains, 'response-domains')}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {copiedCode === 'response-domains' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto max-h-96">
                  <pre className="text-sm text-gray-100 font-mono">
                    {responseExamples.domains}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">GET /api/domains/{`{tokenId}`}</h3>
                  <button
                    onClick={() => copyToClipboard(responseExamples.domain, 'response-domain')}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {copiedCode === 'response-domain' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto max-h-96">
                  <pre className="text-sm text-gray-100 font-mono">
                    {responseExamples.domain}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limits & Support */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Rate Limits</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• <strong>Public endpoints:</strong> 100 requests/minute</li>
              <li>• <strong>No authentication required</strong></li>
              <li>• <strong>CORS enabled</strong> for browser requests</li>
              <li>• <strong>Response caching:</strong> 5-15 minutes</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Support</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Built on <a href="https://docs.doma.xyz" className="text-blue-600 dark:text-blue-400 hover:underline">Doma Protocol</a></li>
              <li>• Real-time data from Doma Subgraph</li>
              <li>• Open source on GitHub</li>
              <li>• Community support on Discord</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}