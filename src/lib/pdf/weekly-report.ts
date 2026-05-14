import PDFDocument from 'pdfkit'

export interface WeeklyReportData {
  agencyName: string
  weekStart: string  // ISO date string
  weekEnd: string
  newLeads: number
  totalLeads: number
  wonLeads: number
  convRate: number
  appointmentsCount: number
}

export async function generateWeeklyReportPdf(data: WeeklyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const weekLabel = `${fmt(data.weekStart)} – ${fmt(data.weekEnd)}`

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill('#1B2B4B')
    doc.fontSize(22).fillColor('white').font('Helvetica-Bold')
      .text('Mandato', 50, 25)
    doc.fontSize(11).fillColor('#a0aec0').font('Helvetica')
      .text('Rapport hebdomadaire', 50, 52)
    doc.fillColor('#1B2B4B')

    let y = 110

    // Title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1B2B4B')
      .text(`Rapport de la semaine du ${weekLabel}`, 50, y)
    y += 28
    doc.fontSize(11).font('Helvetica').fillColor('#64748b')
      .text(data.agencyName, 50, y)
    y += 40

    // Divider
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').stroke()
    y += 24

    // Stats cards row
    const cardW = (doc.page.width - 100 - 24) / 3
    const cards = [
      { label: 'Nouveaux leads', value: String(data.newLeads), color: '#1B2B4B' },
      { label: 'Total leads', value: String(data.totalLeads), color: '#1B2B4B' },
      { label: 'Taux de conversion', value: `${data.convRate}%`, color: '#FF6B35' },
    ]
    cards.forEach((c, i) => {
      const x = 50 + i * (cardW + 12)
      doc.roundedRect(x, y, cardW, 80, 8).fill('#f0f3f9')
      doc.fontSize(28).font('Helvetica-Bold').fillColor(c.color)
        .text(c.value, x, y + 14, { width: cardW, align: 'center' })
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
        .text(c.label.toUpperCase(), x, y + 52, { width: cardW, align: 'center' })
    })
    y += 104

    // Leads gagnés
    doc.fontSize(11).font('Helvetica').fillColor('#475569')
      .text(`Leads gagnés cette semaine : ${data.wonLeads}`, 50, y)
    y += 18
    doc.text(`Rendez-vous programmés : ${data.appointmentsCount}`, 50, y)
    y += 40

    // Divider
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').stroke()
    y += 24

    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
      .text(
        `Ce rapport a été généré automatiquement par Mandato le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        50, y, { width: doc.page.width - 100 }
      )

    doc.end()
  })
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
