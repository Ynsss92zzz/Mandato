import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'

  const { data: agencies } = await supabase.from('agencies').select('id, name')
  let sent = 0

  for (const agency of agencies ?? []) {
    const { data: members } = await supabase
      .from('agency_members')
      .select('role, profiles(email, full_name)')
      .eq('agency_id', agency.id)
      .eq('role', 'owner')

    const owner = (members?.[0]?.profiles) as { email: string; full_name: string | null } | null
    if (!owner?.email) continue

    const firstName = owner.full_name?.split(' ')[0] ?? 'Agent'

    // Today's appointments
    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('title, scheduled_at, lead_id')
      .eq('agency_id', agency.id)
      .gte('scheduled_at', todayStart)
      .lt('scheduled_at', todayEnd)
      .neq('status', 'annule')
      .order('scheduled_at', { ascending: true })

    // Lead names for appointments
    const apptLeadIds = (todayAppts ?? []).map(a => a.lead_id).filter(Boolean) as string[]
    const leadNameMap: Record<string, string> = {}
    if (apptLeadIds.length > 0) {
      const { data: apptLeads } = await supabase
        .from('leads').select('id, first_name, last_name').in('id', apptLeadIds)
      ;(apptLeads ?? []).forEach(l => {
        leadNameMap[l.id] = [l.first_name, l.last_name].filter(Boolean).join(' ')
      })
    }

    // Hot leads (score > 7, still active)
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('first_name, last_name, phone, budget, ai_score')
      .eq('agency_id', agency.id)
      .gt('ai_score', 7)
      .in('status', ['nouveau', 'contacte', 'qualifie', 'rdv_planifie', 'proposition'])
      .order('ai_score', { ascending: false })
      .limit(5)

    // Leads pending follow-up
    const { count: pendingCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
      .in('status', ['nouveau', 'contacte'])
      .or(`last_contacted_at.is.null,last_contacted_at.lte.${sevenDaysAgo}`)

    // Potential commission from hot leads
    const hotBudgets = (hotLeads ?? []).map(l => l.budget ?? 0).filter(b => b > 0)
    const potentialCommission = hotBudgets.reduce((sum, b) => sum + b * 0.02, 0)

    // Build HTML sections
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const apptRows = (todayAppts ?? []).length > 0
      ? (todayAppts ?? []).map(a => {
          const time = new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          const clientName = a.lead_id ? (leadNameMap[a.lead_id] ?? a.title) : a.title
          return `<li style="margin-bottom:10px;padding:10px 14px;background:#f8fafc;border-radius:8px;font-size:14px;color:#1B2B4B">
            ⏰ <strong>${time}</strong> — ${clientName}
          </li>`
        }).join('')
      : `<li style="color:#94a3b8;font-size:14px;padding:10px 0">Aucun rendez-vous aujourd'hui</li>`

    const hotRows = (hotLeads ?? []).length > 0
      ? (hotLeads ?? []).map(l => {
          const name = [l.first_name, l.last_name].filter(Boolean).join(' ')
          const budget = l.budget ? fmt.format(l.budget) : 'budget N/A'
          const phone = l.phone ? ` — 📱 ${l.phone}` : ''
          return `<li style="margin-bottom:10px;padding:10px 14px;background:#fff4f0;border:1px solid #ffdecc;border-radius:8px;font-size:14px;color:#1B2B4B">
            🔥 <strong>${name}</strong> — Score <strong>${l.ai_score}/10</strong> — ${budget}${phone}
          </li>`
        }).join('')
      : `<li style="color:#94a3b8;font-size:14px;padding:10px 0">Aucun lead chaud en ce moment</li>`

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc">
  <div style="background:#1B2B4B;padding:32px 40px;text-align:center">
    <span style="color:white;font-size:24px;font-weight:700;letter-spacing:-0.5px">Mandato</span>
  </div>
  <div style="background:white;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <h1 style="color:#1B2B4B;font-size:22px;margin:0 0 4px">☀️ Bonjour ${firstName} !</h1>
    <p style="color:#64748b;margin:0 0 32px;font-size:14px;text-transform:capitalize">${dateStr} — Votre briefing du matin.</p>

    <h2 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin:0 0 12px">📅 Rendez-vous du jour</h2>
    <ul style="list-style:none;margin:0 0 28px;padding:0">${apptRows}</ul>

    <h2 style="font-size:13px;color:#FF6B35;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin:0 0 12px">🔥 Leads chauds à appeler en priorité</h2>
    <ul style="list-style:none;margin:0 0 28px;padding:0">${hotRows}</ul>

    <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
      <tr>
        <td style="width:50%;padding-right:8px;vertical-align:top">
          <div style="background:#f0f3f9;border-radius:12px;padding:20px;text-align:center">
            <p style="margin:0 0 4px;font-size:32px;font-weight:800;color:#1B2B4B">${pendingCount ?? 0}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">leads en attente de relance</p>
          </div>
        </td>
        <td style="width:50%;padding-left:8px;vertical-align:top">
          <div style="background:#fff4f0;border-radius:12px;padding:20px;text-align:center">
            <p style="margin:0 0 4px;font-size:32px;font-weight:800;color:#FF6B35">${potentialCommission > 0 ? fmt.format(potentialCommission) : '—'}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">commission potentielle (2%)</p>
          </div>
        </td>
      </tr>
    </table>

    <a href="${appUrl}/dashboard"
       style="display:inline-block;background:#FF6B35;color:white;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;font-size:14px">
      Ouvrir Mandato →
    </a>

    <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;line-height:1.5">
      Briefing automatique envoyé chaque matin par <strong>Mandato</strong> — ${agency.name}
    </p>
  </div>
</div>`

    await sendEmail({
      to: owner.email,
      subject: `☀️ Votre briefing Mandato — ${dateStr}`,
      html,
      text: `Bonjour ${firstName} ! RDV aujourd'hui : ${(todayAppts ?? []).length}. Leads chauds : ${(hotLeads ?? []).length}. En attente de relance : ${pendingCount ?? 0}. Commission potentielle : ${potentialCommission > 0 ? fmt.format(potentialCommission) : '—'}.`,
    })
    sent++
  }

  return NextResponse.json({ success: true, sent })
}
