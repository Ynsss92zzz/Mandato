'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  Zap,
  FileText,
  BarChart3,
  Users2,
  Settings,
  Clock,
  BookOpen,
  CreditCard,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navMain = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/leads',                icon: Users,           label: 'Leads' },
  { href: '/conversations',        icon: MessageSquare,   label: 'Conversations' },
  { href: '/appointments',         icon: Calendar,        label: 'Rendez-vous' },
  { href: '/sequences',            icon: Zap,             label: 'Séquences' },
  { href: '/settings/billing',     icon: CreditCard,      label: 'Mon plan' },
  { href: '/sequences/templates',  icon: FileText,        label: 'Templates' },
  { href: '/weekly-reports',       icon: BookOpen,        label: 'Résumés hebdo' },
  { href: '/calculateur',          icon: Calculator,      label: 'Calculateur' },
]

const navAgence = [
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/team',      icon: Users2,    label: 'Mon équipe' },
]

interface SidebarProps {
  agencyName: string
  plan: string
}

export function Sidebar({ agencyName, plan }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/sequences') return pathname === '/sequences' || (pathname.startsWith('/sequences/') && !pathname.startsWith('/sequences/templates'))
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <aside className="w-60 bg-[#1B2B4B] flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 mb-1">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Mandato"
            width={28}
            height={28}
            className="rounded-md object-contain flex-shrink-0"
          />
          <span className="text-white font-semibold text-[15px] tracking-tight">Mandato</span>
        </Link>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-2">
        {navMain.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <Icon
                className={cn(
                  'w-[15px] h-[15px] flex-shrink-0 transition-colors',
                  active ? 'text-[#F97316]' : 'text-white/30 group-hover:text-white/50'
                )}
              />
              {label}
            </Link>
          )
        })}

        {/* Séparateur Agence */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Agence</p>
        </div>

        {/* Analytics — Pro+ */}
        {(() => {
          const { href, icon: Icon, label } = navAgence[0]
          const locked = plan === 'starter'
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
                active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                locked && 'opacity-40 pointer-events-none'
              )}
            >
              <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-[#F97316]' : 'text-white/30 group-hover:text-white/50')} />
              <span className="flex-1">{label}</span>
              {locked && (
                <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-medium">Pro</span>
              )}
            </Link>
          )
        })()}

        {/* Team — Agence only */}
        {(() => {
          const { href, icon: Icon, label } = navAgence[1]
          const locked = plan !== 'agence'
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
                active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                locked && 'opacity-40 pointer-events-none'
              )}
            >
              <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-[#F97316]' : 'text-white/30 group-hover:text-white/50')} />
              <span className="flex-1">{label}</span>
              {locked && (
                <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-medium">Agence</span>
              )}
            </Link>
          )
        })()}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-white/[0.06] space-y-0.5">
        <Link
          href="/settings/availability"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
            isActive('/settings/availability') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
        >
          <Clock className={cn('w-[15px] h-[15px] flex-shrink-0', isActive('/settings/availability') ? 'text-[#F97316]' : 'text-white/30 group-hover:text-white/50')} />
          Disponibilités
        </Link>

        {/* Parrainage masqué — accessible via /settings/referral */}
        {false && <Link href="/settings/referral" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/50">
          <span className="w-[15px] h-[15px] flex-none text-center text-xs">🎁</span>
          Parrainage
        </Link>}

        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
            pathname === '/settings' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
        >
          <Settings className={cn('w-[15px] h-[15px] flex-shrink-0', pathname === '/settings' ? 'text-[#F97316]' : 'text-white/30 group-hover:text-white/50')} />
          Paramètres
        </Link>

        {/* Plan badge */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <p className="text-white/30 text-[11px] truncate max-w-[130px]">{agencyName}</p>
          <span className="text-[10px] bg-white/8 text-white/40 px-2 py-0.5 rounded capitalize border border-white/10">
            {plan}
          </span>
        </div>
      </div>
    </aside>
  )
}
