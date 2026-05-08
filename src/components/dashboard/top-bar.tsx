'use client'

import { logout } from '@/actions/auth'
import { LogOut, Bell, Search, X } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SearchLead {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  status: string
}

interface SearchAppointment {
  id: string
  title: string
  scheduled_at: string
}

interface SearchResults {
  leads: SearchLead[]
  appointments: SearchAppointment[]
}

interface TopBarProps {
  userName: string
  userEmail: string
  pageTitle?: string
}

export function TopBar({ userName, userEmail, pageTitle }: TopBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data: SearchResults = await res.json()
          setResults(data)
          setOpen(true)
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function clearSearch() {
    setQuery('')
    setOpen(false)
    setResults(null)
  }

  function navigate(url: string) {
    clearSearch()
    router.push(url)
  }

  const hasResults = results && (results.leads.length > 0 || results.appointments.length > 0)

  return (
    <header className="h-14 bg-white border-b border-zinc-100 flex items-center justify-between px-6 flex-shrink-0">
      {pageTitle ? (
        <h1 className="text-base font-semibold text-[#1B2B4B]">{pageTitle}</h1>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        {/* Global search */}
        <div ref={wrapperRef} className="relative hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results && setOpen(true)}
              placeholder="Rechercher leads, RDV…"
              className="w-56 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B] bg-zinc-50 focus:bg-white transition-colors"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {open && (
            <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-xl border border-zinc-200 shadow-lg z-50 overflow-hidden">
              {searching && (
                <div className="px-4 py-3 text-sm text-zinc-400 flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                  Recherche…
                </div>
              )}

              {!searching && !hasResults && (
                <div className="px-4 py-3 text-sm text-zinc-400">Aucun résultat</div>
              )}

              {!searching && results && results.leads.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                    Leads
                  </p>
                  {results.leads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-zinc-800">
                        {lead.first_name}{lead.last_name ? ` ${lead.last_name}` : ''}
                      </p>
                      {lead.email && <p className="text-xs text-zinc-400">{lead.email}</p>}
                    </button>
                  ))}
                </div>
              )}

              {!searching && results && results.appointments.length > 0 && (
                <div className={results.leads.length > 0 ? 'border-t border-zinc-100' : ''}>
                  <p className="px-4 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                    Rendez-vous
                  </p>
                  {results.appointments.map(appt => (
                    <button
                      key={appt.id}
                      onClick={() => navigate('/appointments')}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-zinc-800">{appt.title}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(appt.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications — placeholder */}
        <button className="relative p-2 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-600">
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1B2B4B] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{getInitials(userName)}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-zinc-800 leading-none">{userName}</p>
            <p className="text-xs text-zinc-400 mt-0.5 leading-none">{userEmail}</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Se déconnecter"
            className="p-2 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-red-500"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  )
}
