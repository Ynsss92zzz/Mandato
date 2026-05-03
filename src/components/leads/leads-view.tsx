'use client'

import { useState } from 'react'
import { LeadKanban } from './lead-kanban'
import { LeadList } from './lead-list'
import { LeadForm } from './lead-form'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Lead = Database['public']['Tables']['leads']['Row']
type View = 'kanban' | 'list'

export function LeadsView({ leads }: { leads: Lead[] }) {
  const [view, setView] = useState<View>('kanban')
  const [formState, setFormState] = useState<{ open: boolean; lead?: Lead }>({ open: false })
  const router = useRouter()

  function openCreate() {
    setFormState({ open: true, lead: undefined })
  }

  function openEdit(lead: Lead) {
    setFormState({ open: true, lead })
  }

  function closeForm() {
    setFormState({ open: false })
  }

  function handleFormSuccess() {
    closeForm()
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-navy">Leads</h1>
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
                view === 'kanban'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
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
                view === 'list'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Liste
            </button>
          </div>

          {/* Add lead button */}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau lead
          </button>
        </div>
      </div>

      {/* Main content */}
      {view === 'kanban' ? (
        <LeadKanban initialLeads={leads} onEdit={openEdit} />
      ) : (
        <LeadList leads={leads} onEdit={openEdit} />
      )}

      {/* Create / Edit form modal */}
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
