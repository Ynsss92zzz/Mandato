import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  qualifie: 'Qualifié',
  rdv_planifie: 'RDV planifié',
  proposition: 'Proposition',
  gagne: 'Gagné',
  perdu: 'Perdu',
}

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Widget site',
  seloger: 'SeLoger',
  leboncoin: 'Leboncoin',
  logicimmo: 'LogicImmo',
  manuel: 'Manuel',
  import: 'Import',
  autre: 'Autre',
}

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Agence introuvable' }, { status: 403 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const email = profile?.email ?? user.email
  if (!email) return NextResponse.json({ error: 'Email introuvable' }, { status: 400 })

  // Fetch leads
  const { data: leads } = await supabase.from('leads').select('status, source, created_at')
  const allLeads = leads ?? []

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const leadsThisMonth = allLeads.filter((l) => new Date(l.created_at) >= startOfMonth).length
  const wonLeads = allLeads.filter((l) => l.status === 'gagne').length
  const conversionRate = allLeads.length > 0 ? Math.round((wonLeads / allLeads.length) * 100) : 0

  // By source
  const sourceMap: Record<string, number> = {}
  for (const l of allLeads) {
    sourceMap[l.source] = (sourceMap[l.source] ?? 0) + 1
  }
  const bySource = Object.entries(sourceMap)
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => ({
      label: SOURCE_LABELS[source] ?? source,
      count,
      percent: Math.round((count / allLeads.length) * 100),
    }))

  // By status
  const statusMap: Record<string, number> = {}
  for (const l of allLeads) {
    statusMap[l.status] = (statusMap[l.status] ?? 0) + 1
  }
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({
    label: STATUS_LABELS[status] ?? status,
    count,
  }))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const sourceRows = bySource
    .map((s) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f4f4f5;">${s.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f4f4f5;text-align:right;">${s.count} (${s.percent}%)</td></tr>`)
    .join('')

  const statusRows = byStatus
    .map((s) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f4f4f5;">${s.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f4f4f5;text-align:right;">${s.count}</td></tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Rapport Mandato</title></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="background:#1B2B4B;padding:24px 28px;">
      <p style="color:rgba(255,255,255,.6);margin:0 0 4px;font-size:13px;">Rapport hebdomadaire</p>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:600;">Mandato Analytics</h1>
      <p style="color:rgba(255,255,255,.5);margin:6px 0 0;font-size:13px;">${dateStr}</p>
    </div>

    <div style="padding:24px 28px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px;">
        <div style="background:#f8f9fc;border-radius:10px;padding:16px;text-align:center;">
          <p style="font-size:28px;font-weight:700;color:#1B2B4B;margin:0;">${allLeads.length}</p>
          <p style="font-size:12px;color:#a1a1aa;margin:4px 0 0;">Total leads</p>
        </div>
        <div style="background:#f8f9fc;border-radius:10px;padding:16px;text-align:center;">
          <p style="font-size:28px;font-weight:700;color:#1B2B4B;margin:0;">${leadsThisMonth}</p>
          <p style="font-size:12px;color:#a1a1aa;margin:4px 0 0;">Ce mois-ci</p>
        </div>
        <div style="background:#f8f9fc;border-radius:10px;padding:16px;text-align:center;">
          <p style="font-size:28px;font-weight:700;color:#1B2B4B;margin:0;">${conversionRate}%</p>
          <p style="font-size:12px;color:#a1a1aa;margin:4px 0 0;">Conversion</p>
        </div>
      </div>

      <h2 style="font-size:14px;font-weight:600;color:#1B2B4B;margin:0 0 12px;">Sources de leads</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <tr style="background:#f8f9fc;">
          <th style="padding:8px 12px;text-align:left;font-weight:500;color:#71717a;">Source</th>
          <th style="padding:8px 12px;text-align:right;font-weight:500;color:#71717a;">Leads</th>
        </tr>
        ${sourceRows || '<tr><td colspan="2" style="padding:12px;color:#a1a1aa;text-align:center;">Aucune donnée</td></tr>'}
      </table>

      <h2 style="font-size:14px;font-weight:600;color:#1B2B4B;margin:0 0 12px;">Par statut</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px;">
        <tr style="background:#f8f9fc;">
          <th style="padding:8px 12px;text-align:left;font-weight:500;color:#71717a;">Statut</th>
          <th style="padding:8px 12px;text-align:right;font-weight:500;color:#71717a;">Leads</th>
        </tr>
        ${statusRows || '<tr><td colspan="2" style="padding:12px;color:#a1a1aa;text-align:center;">Aucune donnée</td></tr>'}
      </table>

      <div style="text-align:center;">
        <a href="${appUrl}/analytics" style="display:inline-block;background:#FF6B35;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          Voir le tableau de bord complet
        </a>
      </div>
    </div>

    <div style="padding:16px 28px;border-top:1px solid #f4f4f5;">
      <p style="font-size:12px;color:#a1a1aa;margin:0;text-align:center;">
        Mandato — Rapport généré automatiquement
      </p>
    </div>
  </div>
</body>
</html>`

  const text = `Rapport Mandato — ${dateStr}\n\nTotal leads : ${allLeads.length}\nCe mois : ${leadsThisMonth}\nConversion : ${conversionRate}%\n\nConsultez votre tableau de bord : ${appUrl}/analytics`

  const { error } = await sendEmail({
    to: email,
    subject: `Rapport Mandato — ${dateStr}`,
    text,
    html,
  })

  if (error) return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })

  return NextResponse.json({ success: true })
}
