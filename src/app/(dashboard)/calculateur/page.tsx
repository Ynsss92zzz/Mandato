'use client'

import { useState } from 'react'
import type { Metadata } from 'next'

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default function CalculateurPage() {
  const [price, setPrice] = useState('')
  const [rate, setRate] = useState(3)

  const parsedPrice = price ? parseFloat(price.replace(/\s/g, '').replace(',', '.')) : NaN
  const commission = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice * (rate / 100) : null
  const net = commission !== null ? parsedPrice - commission : null

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Calculateur de commission</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Estimez votre commission en temps réel</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Prix de vente (€)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex : 350000"
            className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Taux de commission (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 transition-colors"
          />
        </div>

        <div className="border-t border-zinc-100 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Prix de vente</span>
            <span className="text-sm font-medium text-[#1B2B4B]">
              {!isNaN(parsedPrice) && parsedPrice > 0 ? fmt.format(parsedPrice) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Commission ({rate}%)</span>
            <span className="text-lg font-bold text-green-600">
              {commission !== null ? fmt.format(commission) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="text-sm text-zinc-500">Net vendeur</span>
            <span className="text-sm font-medium text-zinc-400">
              {net !== null ? fmt.format(net) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick rate presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400">Taux courants :</span>
        {[2, 2.5, 3, 3.5, 4, 5].map((r) => (
          <button
            key={r}
            onClick={() => setRate(r)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              rate === r
                ? 'bg-[#1B2B4B] text-white border-[#1B2B4B]'
                : 'bg-white text-zinc-500 border-zinc-200 hover:border-[#1B2B4B]/30 hover:text-[#1B2B4B]'
            }`}
          >
            {r}%
          </button>
        ))}
      </div>
    </div>
  )
}
