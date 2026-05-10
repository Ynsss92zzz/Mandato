import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToMany, type StoredSubscription } from '@/lib/push'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'

interface AiAnalysis {
  intention?: string
  budget_estime?: string
  urgence?: string
  profil?: string
  recommandation?: string
}

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const in60 = new Date(now.getTime() + 60 * 60 * 1000)
  const in90 = new Date(now.getTime() + 90 * 60 * 1000)

  // Appointments starting in 60–90 minutes
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, agency_id, title, scheduled_at, lead_id')
    .gte('scheduled_at', in60.toISOString())
    .lte('scheduled_at', in90.toISOString())
    .eq('status', 'planifie')

  let notified = 0

  for (const appt of appointments ?? []) {
    const time = new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    // ── Push notification ──────────────────────────────────────────────
    const { data: pushSubs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('agency_id', appt.agency_id)

    if (pushSubs && pushSubs.length > 0) {
      await sendPushToMany(pushSubs as StoredSubscription[], {
        title: 'RDV dans 1 heure',
        body: `${appt.title} — ${time}`,
        url: '/appointments',
      })
    }

    // ── Email prep sheet (if appointment has a lead) ───────────────────
    if (!appt.lead_id) { notified++; continue }

    const [
      { data: lead },
      { data: messages },
      { data: ownerMembers },
    ] = await Promise.all([
      supabase
        .from('leads')
        .select('first_name, last_name, email, phone, budget, property_type, location_desired, ai_score, ai_analysis, message, notes')
        .eq('id', appt.lead_id)
        .single(),
      supabase
        .from('messages')
        .select('content, direction, sent_at, channel')
        .eq('lead_id', appt.lead_id)
        .order('sent_at', { ascending: false })
        .limit(6),
      supabase
        .from('agency_members')
        .select('profiles(email, full_name)')
        .eq('agency_id', appt.agency_id)
        .eq('role', 'owner'),
    ])

    const agentProfile = (ownerMembers?.[0]?.profiles) as { email: string; full_name: string | null } | null
    if (!agentProfile?.email || !lead) { notified++; continue }

    const analysis = lead.ai_analysis as AiAnalysis | null
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    const agentFirst = agentProfile.full_name?.split(' ')[0] ?? 'Agent'

    // Build message history rows
    const msgRows = (messages ?? []).length > 0
      ? [...(messages ?? [])].reverse().map(m => {
          const label = m.direction === 'entrant' ? '← Client' : '→ Vous'
          const date = m.sent_at ? new Date(m.sent_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
          const bg = m.direction === 'entrant' ? '#f0f3f9' : '#fff4f0'
          return `<div style="margin-bottom:10px;padding:10px 14px;background:${bg};border-radius:8px">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8">${label} · ${m.channel} · ${date}</p>
            <p style="margin:0;font-size:13px;color:#1B2B4B;line-height:1.5">${m.content.slice(0, 300)}${m.content.length > 300 ? '…' : ''}</p>
          </div>`
        }).join('')
      : `<p style="color:#94a3b8;font-size:13px">Aucun échange précédent.</p>`

    const html = `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;background:#f8fafc">
  <div style="background:#1B2B4B;padding:28px 40px;display:flex;align-items:center;justify-content:space-between">
    <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px">Mandato</span>
    <span style="color:#FF6B35;font-size:13px;font-weight:600;background:rgba(255,107,53,.15);padding:4px 12px;border-radius:20px">📋 Fiche préparation</span>
  </div>
  <div style="background:white;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <h1 style="color:#1B2B4B;font-size:20px;margin:0 0 4px">RDV dans 1 heure, ${agentFirst} !</h1>
    <p style="color:#64748b;margin:0 0 32px;font-size:14px">
      📅 <strong>${appt.title}</strong> à <strong>${time}</strong>
    </p>

    <!-- Lead profile -->
    <div style="background:#f0f3f9;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">👤 Profil du client</p>
      <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1B2B4B">${leadName}</p>
      ${lead.email ? `<p style="margin:0 0 4px;font-size:14px;color:#475569">✉️ ${lead.email}</p>` : ''}
      ${lead.phone ? `<p style="margin:0 0 4px;font-size:14px;color:#475569">📱 <strong>${lead.phone}</strong></p>` : ''}
      ${lead.budget ? `<p style="margin:0 0 4px;font-size:14px;color:#475569">💰 Budget : <strong>${fmt.format(lead.budget)}</strong></p>` : ''}
      ${lead.property_type ? `<p style="margin:0 0 4px;font-size:14px;color:#475569">🏠 Type : ${lead.property_type}</p>` : ''}
      ${lead.location_desired ? `<p style="margin:0;font-size:14px;color:#475569">📍 Secteur : ${lead.location_desired}</p>` : ''}
    </div>

    <!-- AI Analysis -->
    ${analysis ? `
    <div style="background:#fff4f0;border:1px solid #ffdecc;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="margin:0 0 16px;font-size:13px;color:#FF6B35;text-transform:uppercase;letter-spacing:.05em;font-weight:600">🤖 Analyse IA — Score ${lead.ai_score ?? '—'}/10</p>
      ${analysis.intention ? `<p style="margin:0 0 8px;font-size:14px;color:#475569">🎯 Intention : <strong>${analysis.intention}</strong></p>` : ''}
      ${analysis.urgence ? `<p style="margin:0 0 8px;font-size:14px;color:#475569">⏳ Urgence : ${analysis.urgence}</p>` : ''}
      ${analysis.budget_estime ? `<p style="margin:0 0 8px;font-size:14px;color:#475569">💶 Budget estimé : ${analysis.budget_estime}</p>` : ''}
      ${analysis.profil ? `<p style="margin:0 0 8px;font-size:14px;color:#475569">👤 Profil : ${analysis.profil}</p>` : ''}
      ${analysis.recommandation ? `<div style="margin-top:12px;padding:12px 16px;background:white;border-left:3px solid #FF6B35;border-radius:4px">
        <p style="margin:0;font-size:14px;color:#1B2B4B;font-weight:500">💡 ${analysis.recommandation}</p>
      </div>` : ''}
    </div>` : ''}

    <!-- First message -->
    ${lead.message ? `
    <div style="margin-bottom:24px">
      <p style="margin:0 0 10px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">📝 Message initial</p>
      <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:14px;color:#475569;line-height:1.6;border-left:3px solid #e2e8f0">
        ${lead.message}
      </div>
    </div>` : ''}

    <!-- Message history -->
    <div style="margin-bottom:28px">
      <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">💬 Historique des échanges</p>
      ${msgRows}
    </div>

    <!-- Notes -->
    ${lead.notes ? `
    <div style="margin-bottom:24px;padding:14px 16px;background:#fefce8;border-radius:8px;border-left:3px solid #fbbf24">
      <p style="margin:0 0 4px;font-size:12px;color:#92400e;font-weight:600;text-transform:uppercase">📌 Notes internes</p>
      <p style="margin:0;font-size:14px;color:#78350f">${lead.notes}</p>
    </div>` : ''}

    <a href="${appUrl}/leads/${appt.lead_id}"
       style="display:inline-block;background:#1B2B4B;color:white;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;font-size:14px">
      Voir la fiche complète →
    </a>
  </div>
</div>`

    await sendEmail({
      to: agentProfile.email,
      subject: `📋 Fiche préparation : RDV avec ${leadName} à ${time}`,
      html,
      text: `RDV avec ${leadName} à ${time}. Tél: ${lead.phone ?? '—'}. Score IA: ${lead.ai_score ?? '—'}/10. Budget: ${lead.budget ? fmt.format(lead.budget) : '—'}.`,
    })

    notified++
  }

  return NextResponse.json({ success: true, notified })
}
