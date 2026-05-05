'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text, label = 'Copier le code' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-[#1B2B4B] hover:bg-[#2D4270] text-white'
      }`}
    >
      {copied
        ? <><Check className="w-4 h-4" />Code copié !</>
        : <><Copy className="w-4 h-4" />{label}</>
      }
    </button>
  )
}
