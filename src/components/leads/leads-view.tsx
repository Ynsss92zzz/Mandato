'use client'

import { useState, useRef, useTransition } from 'react'
import { LeadKanban } from './lead-kanban'
import { LeadList } from './lead-list'
import { LeadForm } from './lead-form'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import { importLeads } from '@/actions/leads'
import { Upload, Download, CheckCircle, AlertCircle, X } from 'lucide-react'

type Lead = Database['public']['Tables']['leads']['Row']
type View = 'kanban' | 'list'
type ImportResult = { count: number } | { error: string } | null

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','

  function parseLine(line: string) {
    const result: string[] = []
    let cur = ''
    let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === sep && !inQ) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim())
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.replace(/^"|"$/g, '') ?? '']))
    })
}

function mapRow(row: Record<string, string>) {
  const get = (...keys: string[]) => { for (const k of keys) if (row[k]) return row[k]; return '' }
  const budgetStr = get('budget')
  const budget = budgetStr ? parseInt(budgetStr.replace(/\D/g, '')) || null : null
  return {
    first_name: get('prénom', 'prenom', 'first_name', 'firstname', 'nom', 'name') || null,
    last_name: get('nom de famille', 'last_name', 'lastname') || null,
    email: get('email', 'e-mail', 'mail') || null,
    phone: get('téléphone', 'telephone', 'tel', 'phone', 'mobile', 'portable') || null,
    budget,
    message: get('message', 'note', 'notes', 'commentaire') || null,
  }
}

export function LeadsView({ leads, isAgence = false }: { leads: Lead[]; isAgence?: boolean }) {
  const [view, setView] = useState<View>('kanban')
  const [formState, setFormState] = useState<{ open: boolean; lead?: Lead }>({ open: false })
  const [importResult, setImportResult] = useState<ImportResult>(null)
  const [importing, startImport] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openCreate() { setFormState({ open: true, lead: undefined }) }
  function openEdit(lead: Lead) { setFormState({ open: true, lead }) }
  function closeForm() { setFormState({ open: false }) }
  function handleFormSuccess() { closeForm(); router.refresh() }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      const mapped = rows.map(mapRow).filter(r => r.first_name != null) as Parameters<typeof importLeads>[0]

      if (mapped.length === 0) {
        setImportResult({ error: 'Aucun lead valide trouvé. Vérifiez que votre CSV contient une colonne "prénom" ou "first_name".' })
        return
      }

      startImport(async () => {
        const result = await importLeads(mapped)
        setImportResult(result ?? { error: 'Erreur inconnue' })
        if (result && 'count' in result) router.refresh()
      })
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[#1B2B4B]">Leads</h1>
          <span className="text-sm text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
            {leads.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'kanban' ? 'bg-white text-[#1B2B4B] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'list' ? 'bg-white text-[#1B2B4B] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Liste
            </button>
          </div>

          {/* Export CSV — Agence plan */}
          {isAgence && (
            <a
              href="/api/export/leads"
              download
              className="flex items-center gap-1.5 border border-zinc-200 bg-white text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </a>
          )}

          {/* Import CSV */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 border border-zinc-200 bg-white text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-60"
          >
            {importing ? (
              <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Importer CSV
          </button>

          {/* New lead */}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#FF8C5A] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau lead
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
          'count' in importResult
            ? 'bg-green-50 border-green-100 text-green-700'
            : 'bg-red-50 border-red-100 text-red-600'
        }`}>
          {'count' in importResult ? (
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span className="flex-1">
            {'count' in importResult
              ? `${importResult.count} lead${importResult.count > 1 ? 's' : ''} importé${importResult.count > 1 ? 's' : ''} avec succès.`
              : importResult.error
            }
          </span>
          <button onClick={() => setImportResult(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main content */}
      {view === 'kanban' ? (
        <LeadKanban initialLeads={leads} onEdit={openEdit} />
      ) : (
        <LeadList leads={leads} onEdit={openEdit} />
      )}

      {formState.open && (
        <LeadForm
          lead={formState.lead}
          onSuccess={handleFormSuccess}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
