import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DownloadPdfButton } from '@/components/weekly-reports/download-pdf-button'
import { FileText, TrendingUp, Users, Calendar } from 'lucide-react'

export const metadata: Metadata = { title: 'Résumés hebdomadaires' }

interface WeeklyReport {
  id: string
  agency_id: string
  week_start: string
  week_end: string
  new_leads: number
  total_leads: number
  won_leads: number
  conv_rate: number
  appointments_count: number
  email_sent: boolean
  created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function WeeklyReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  const agencyId = member?.agency_id
  if (!agencyId) return null

  // weekly_reports is not yet in the generated types (migration pending)
  const { data: reports } = await supabase
    .from('weekly_reports' as never)
    .select('*')
    .eq('agency_id' as never, agencyId)
    .order('week_start' as never, { ascending: false })
    .limit(52) as unknown as { data: WeeklyReport[] | null }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Résumés hebdomadaires</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Générés automatiquement chaque lundi — envoyés par email avec PDF joint
        </p>
      </div>

      {(!reports || reports.length === 0) ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium mb-1">Aucun résumé disponible</p>
          <p className="text-sm text-zinc-400">
            Le premier résumé sera généré le lundi prochain à 9h UTC.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Semaine</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <span className="flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Nouveaux</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <span className="flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Total</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <span className="flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> Conversion</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <span className="flex items-center justify-center gap-1"><Calendar className="w-3 h-3" /> RDV</span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.id} className={`border-b border-zinc-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/40'}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#1B2B4B]">
                      {fmtDate(r.week_start)} – {fmtDate(r.week_end)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className="text-[#1B2B4B] font-semibold">{r.new_leads}</span>
                  </td>
                  <td className="text-center px-4 py-3.5 text-zinc-600">{r.total_leads}</td>
                  <td className="text-center px-4 py-3.5">
                    <span className={`font-semibold ${r.conv_rate >= 20 ? 'text-green-600' : r.conv_rate >= 10 ? 'text-amber-600' : 'text-zinc-500'}`}>
                      {r.conv_rate}%
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5 text-zinc-600">{r.appointments_count}</td>
                  <td className="text-right px-5 py-3.5">
                    {r.email_sent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        ✓ Envoyé
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="text-right px-5 py-3.5">
                    <DownloadPdfButton reportId={r.id} weekStart={r.week_start} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
