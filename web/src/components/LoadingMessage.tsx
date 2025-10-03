'use client'

import { useEffect, useState } from 'react'

const loadingMessages = [
  "Summoning domain spirits...",
  "Calculating blockchain vibes...",
  "Asking ChatGPT for domain advice...",
  "Teaching AI to pronounce .xyz...",
  "Bribing the smart contract...",
  "Counting digital real estate...",
  "Waking up the indexers...",
  "Downloading the entire internet...",
  "Consulting the domain oracle...",
  "Decentralizing the loading bar...",
  "Mining for fresh domains...",
  "Negotiating with gas fees...",
  "Tokenizing your patience...",
  "Staking your expectations...",
  "Forking the blockchain (jk)...",
]

export function LoadingMessage() {
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])
  }, [])

  if (!mounted) {
    return <span className="opacity-0">Loading...</span>
  }

  return <span>{message}</span>
}
