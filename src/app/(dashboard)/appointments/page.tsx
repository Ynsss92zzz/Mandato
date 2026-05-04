import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Rendez-vous' }

export default function AppointmentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-6">Rendez-vous</h1>
    </div>
  )
}
