import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Paramètres' }

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-6">Paramètres</h1>
    </div>
  )
}
