import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[weekly-report] Unauthorized — received:', auth?.slice(0, 20) ?? '(none)')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[weekly-report] ═══ START ═══')
  console.log('[weekly-report] env — RESEND_API_KEY:', process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}…)` : '⚠ MISSING')
  console.log('[weekly-report] env — RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL ?? '(default noreply@mandato.fr)')

  const supabase = createAdminClient()
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weekStart = new Date(oneWeekAgo)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(now)
  weekEnd.setHours(23, 59, 59, 999)

  const weekStartISO = weekStart.toISOString().slice(0, 10)
  const weekEndISO = weekEnd.toISOString().slice(0, 10)
  console.log('[weekly-report] week:', weekStartISO, '→', weekEndISO)

  const { data: agencies, error: agencyErr } = await supabase
    .from('agencies')
    .select('id, name, notif_weekly_report')
  if (agencyErr) {
    console.error('[weekly-report] ⚠ agencies fetch error — code:', agencyErr.code, '| message:', agencyErr.message)
    return NextResponse.json({ error: agencyErr.message }, { status: 500 })
  }
  console.log('[weekly-report] agencies found:', agencies?.length ?? 0, agencies?.map(a => `${a.id.slice(0, 8)} "${a.name}"`).join(', '))

  if (!agencies || agencies.length === 0) {
    console.log('[weekly-report] ═══ END (no agencies) ═══')
    return NextResponse.json({ success: true, sent: 0 })
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const agency of agencies) {
    const ctx = `[agency=${agency.id.slice(0, 8)} "${agency.name}"]`
    try {
      console.log(`${ctx} ── processing`)

      const { data: memberRow, error: membersErr } = await supabase
        .from('agency_members')
        .select('profile_id')
        .eq('agency_id', agency.id)
        .eq('role', 'owner')
        .single()

      if (membersErr) {
        console.error(`${ctx} ⚠ members fetch error:`, membersErr.message)
      }

      if (!memberRow?.profile_id) {
        console.warn(`${ctx} ⚠ no owner member found — skipping`)
        skipped++
        continue
      }

      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', memberRow.profile_id)
        .single()

      if (profileErr) {
        console.error(`${ctx} ⚠ profile fetch error:`, profileErr.message)
      }

      const ownerProfile = profileRow as { email: string; full_name: string | null } | null
      console.log(`${ctx} owner profile: ${ownerProfile ? `"${ownerProfile.full_name}" <${ownerProfile.email}>` : '(none found)'}`)

      if (!ownerProfile?.email) {
        console.warn(`${ctx} ⚠ no owner email — skipping`)
        skipped++
        continue
      }

      if (agency.notif_weekly_report === false) {
        console.log(`${ctx} notif_weekly_report=false — skipping`)
        skipped++
        continue
      }

      const [newLeadsRes, totalLeadsRes, wonLeadsRes, apptRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agency.id)
          .gte('created_at', oneWeekAgo.toISOString()),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agency.id),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agency.id)
          .eq('status', 'gagne'),
        supabase
          .from('appointments')
          .select('id, title, scheduled_at')
          .eq('agency_id', agency.id)
          .gte('scheduled_at', now.toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5),
      ])

      if (newLeadsRes.error) console.error(`${ctx} ⚠ newLeads query error:`, newLeadsRes.error.message)
      if (totalLeadsRes.error) console.error(`${ctx} ⚠ totalLeads query error:`, totalLeadsRes.error.message)
      if (wonLeadsRes.error) console.error(`${ctx} ⚠ wonLeads query error:`, wonLeadsRes.error.message)
      if (apptRes.error) console.error(`${ctx} ⚠ appointments query error:`, apptRes.error.message)

      const newLeads = newLeadsRes.count ?? 0
      const totalLeads = totalLeadsRes.count ?? 0
      const wonLeads = wonLeadsRes.count ?? 0
      const convRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
      const appointments = apptRes.data ?? []

      console.log(`${ctx} stats — newLeads=${newLeads} total=${totalLeads} won=${wonLeads} conv=${convRate}% appts=${appointments.length}`)

      // Save report to DB
      const { error: upsertErr } = await (supabase as unknown as {
        from: (t: string) => { upsert: (d: object, o: object) => Promise<{ error: { message: string } | null }> }
      })
        .from('weekly_reports')
        .upsert({
          agency_id: agency.id,
          week_start: weekStartISO,
          week_end: weekEndISO,
          new_leads: newLeads,
          total_leads: totalLeads,
          won_leads: wonLeads,
          conv_rate: convRate,
          appointments_count: appointments.length,
          email_sent: false,
        }, { onConflict: 'agency_id,week_start' })
      if (upsertErr) console.error(`${ctx} ⚠ weekly_reports upsert error:`, upsertErr.message)

const apptRows = appointments.length > 0
        ? appointments.map(a => `
          <tr>
            <td style="padding:8px 0;color:#475569;font-size:14px;border-bottom:1px solid #f1f5f9">
              📅 ${new Date(a.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </td>
            <td style="padding:8px 0 8px 12px;color:#1B2B4B;font-size:14px;font-weight:500;border-bottom:1px solid #f1f5f9">${a.title}</td>
          </tr>`).join('')
        : `<tr><td colspan="2" style="padding:8px 0;color:#94a3b8;font-size:14px">Aucun rendez-vous à venir</td></tr>`

      const greeting = ownerProfile.full_name ? ` ${ownerProfile.full_name.split(' ')[0]}` : ''
      const dateLabel = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const subject = `📊 Votre rapport hebdomadaire Mandato — ${dateLabel}`

      const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc">
  <div style="background:#1B2B4B;padding:32px 40px;text-align:center">
    <span style="color:white;font-size:24px;font-weight:700;letter-spacing:-0.5px">Mandato</span>
  </div>
  <div style="background:white;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <h1 style="color:#1B2B4B;font-size:22px;margin:0 0 4px">Rapport de la semaine 📊</h1>
    <p style="color:#64748b;margin:0 0 32px">Bonjour${greeting}, voici vos performances pour la semaine du ${oneWeekAgo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
      <tr>
        <td style="width:33%;padding-right:8px">
          <div style="background:#f0f3f9;border-radius:12px;padding:20px;text-align:center">
            <p style="margin:0 0 4px;font-size:32px;font-weight:700;color:#1B2B4B">${newLeads}</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Nouveaux leads</p>
          </div>
        </td>
        <td style="width:33%;padding:0 4px">
          <div style="background:#f0f3f9;border-radius:12px;padding:20px;text-align:center">
            <p style="margin:0 0 4px;font-size:32px;font-weight:700;color:#1B2B4B">${totalLeads}</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Total leads</p>
          </div>
        </td>
        <td style="width:33%;padding-left:8px">
          <div style="background:#fff4f0;border-radius:12px;padding:20px;text-align:center">
            <p style="margin:0 0 4px;font-size:32px;font-weight:700;color:#FF6B35">${convRate}%</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Conversion</p>
          </div>
        </td>
      </tr>
    </table>

    <h2 style="color:#1B2B4B;font-size:15px;font-weight:600;margin:0 0 12px">Prochains rendez-vous</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
      ${apptRows}
    </table>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'}/weekly-reports"
       style="display:inline-block;background:#FF6B35;color:white;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;font-size:14px">
      Voir tous les rapports →
    </a>

    <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;line-height:1.5">
      Ce rapport est envoyé automatiquement chaque lundi matin par <strong>Mandato</strong>.<br>
      ${agency.name}
    </p>
  </div>
</div>`

      const text = `${subject}\n\nNouveaux leads cette semaine : ${newLeads}\nTotal leads : ${totalLeads}\nTaux de conversion : ${convRate}%\n\nProchains RDV :\n${appointments.map(a => `- ${a.title} — ${new Date(a.scheduled_at).toLocaleDateString('fr-FR')}`).join('\n') || 'Aucun'}`

      console.log(`${ctx} → sendEmail to=${ownerProfile.email} subject="${subject}"`)

      try {
        await sendEmail({
          to: ownerProfile.email,
          subject,
          html,
          text,
        })
        console.log(`${ctx} ✓ sendEmail OK`)
      } catch (emailErr) {
        const e = emailErr as Record<string, unknown>
        console.error(
          `${ctx} ⚠ sendEmail FAILED —`,
          `name: ${e?.name ?? '?'}`,
          `| message: ${e?.message ?? '?'}`,
          `| statusCode: ${e?.statusCode ?? e?.status ?? '?'}`,
          `| body: ${JSON.stringify(e?.response ?? e?.body ?? e?.data ?? '(no body)')}`,
        )
        failed++
        continue
      }

      // Mark email as sent
      await (supabase as unknown as {
        from: (t: string) => { update: (d: object) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } }
      })
        .from('weekly_reports')
        .update({ email_sent: true })
        .eq('agency_id', agency.id)
        .eq('week_start', weekStartISO)

      sent++
    } catch (err) {
      const e = err as Record<string, unknown>
      console.error(`${ctx} ⚠ unexpected error — ${e?.message ?? JSON.stringify(err)}`)
      failed++
    }
  }

  console.log(`[weekly-report] ═══ END — sent=${sent} skipped=${skipped} failed=${failed} ═══`)
  return NextResponse.json({ success: true, sent, skipped, failed })
}
