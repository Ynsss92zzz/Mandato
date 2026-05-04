'use client'

import { useState } from 'react'

interface ReferralInfo {
  code: string | null
  link: string | null
  referrals: Array<{
    id: string
    used_at: string
    reward_applied_at: string | null
    referee_agency_id: string
  }>
  totalReferrals: number
  rewardedMonths: number
}

export function ReferralDashboard({ info }: { info: ReferralInfo }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (!info.link) return
    navigator.clipboard.writeText(info.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Programme de parrainage</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gagnez 1 mois offert pour chaque agent que vous recommandez.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-amber-800 mb-3">Comment ça marche ?</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { step: '1', label: 'Partagez votre lien', icon: '🔗' },
            { step: '2', label: 'Votre filleul s\'inscrit', icon: '👤' },
            { step: '3', label: 'Vous gagnez 1 mois offert', icon: '🎁' },
          ].map((s) => (
            <div key={s.step}>
              <div className="text-2xl mb-1.5">{s.icon}</div>
              <p className="text-xs font-medium text-amber-800">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-600 text-center mt-4">
          Votre filleul bénéficie de <strong>30 jours d&apos;essai</strong> au lieu de 14.
        </p>
      </div>

      {/* Your referral link */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Votre lien de parrainage</h2>

        {info.code ? (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <span className="text-xs font-mono text-[#1B2B4B]/60 tracking-wider font-semibold">
                  {info.code}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="text-xs text-zinc-400 truncate">{info.link}</span>
              </div>
              <button
                onClick={copyLink}
                className="px-4 py-2.5 text-sm font-medium text-white bg-[#1B2B4B] hover:bg-[#2D4270] rounded-lg transition-colors flex-none"
              >
                {copied ? '✓ Copié !' : 'Copier'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Rejoins Mandato, le CRM IA pour agents immobiliers ! Essai gratuit 30 jours avec mon lien : ${info.link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                📱 WhatsApp
              </a>
              <a
                href={`mailto:?subject=Je te recommande Mandato&body=Bonjour,%0A%0AJe te recommande Mandato, un outil IA pour automatiser la prospection immobilière.%0A%0AAvec mon lien, tu bénéficies de 30 jours d'essai gratuit : ${info.link}%0A%0ABonne découverte !`}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                ✉️ Email
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-400">
            Votre code est en cours de génération. Rechargez la page dans quelques instants.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center">
          <p className="text-3xl font-bold text-[#1B2B4B] mb-1">{info.totalReferrals}</p>
          <p className="text-sm text-zinc-400">Filleul{info.totalReferrals > 1 ? 's' : ''} inscrit{info.totalReferrals > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center">
          <p className="text-3xl font-bold text-[#FF6B35] mb-1">{info.rewardedMonths}</p>
          <p className="text-sm text-zinc-400">Mois offert{info.rewardedMonths > 1 ? 's' : ''} gagnés</p>
        </div>
      </div>

      {/* Referral list */}
      {info.referrals.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-[#1B2B4B]">Historique des parrainages</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {info.referrals.map((r, i) => (
              <div key={r.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-zinc-500">#{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1B2B4B]">Filleul #{i + 1}</p>
                    <p className="text-xs text-zinc-400">
                      Inscrit le {new Date(r.used_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  r.reward_applied_at
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {r.reward_applied_at ? '✓ 1 mois offert' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
