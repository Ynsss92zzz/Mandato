'use client'

import Link from 'next/link'
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
  ChevronRight,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navMain = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { href: '/appointments', icon: Calendar, label: 'Rendez-vous' },
  { href: '/sequences', icon: Zap, label: 'Séquences' },
  { href: '/sequences/templates', icon: FileText, label: 'Templates' },
]

const navAgence = [
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/team', icon: Users2, label: 'Mon équipe' },
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
    <aside className="w-64 bg-[#1B2B4B] flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Mandato"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          <span className="text-white font-bold text-lg tracking-tight">Mandato</span>
        </Link>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navMain.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
              isActive(href)
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4 flex-shrink-0',
                isActive(href) ? 'text-[#FF6B35]' : 'text-white/40 group-hover:text-white/70'
              )}
            />
            {label}
            {isActive(href) && (
              <ChevronRight className="w-3 h-3 ml-auto text-white/30" />
            )}
          </Link>
        ))}

        {/* Séparateur + section Agence */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-semibold text-white/25 uppercase tracking-widest">
            Agence
          </p>
        </div>
        {/* Analytics — Pro+ */}
        {navAgence.slice(0, 1).map(({ href, icon: Icon, label }) => {
          const locked = plan === 'starter'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
                isActive(href) ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
                locked && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive(href) ? 'text-[#FF6B35]' : 'text-white/40 group-hover:text-white/70')} />
              {label}
              {locked && (
                <span className="ml-auto text-[10px] bg-[#FF6B35]/20 text-[#FF6B35] px-1.5 py-0.5 rounded font-medium">Pro</span>
              )}
            </Link>
          )
        })}
        {/* Team — Agence only */}
        {navAgence.slice(1).map(({ href, icon: Icon, label }) => {
          const locked = plan !== 'agence'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
                isActive(href) ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
                locked && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive(href) ? 'text-[#FF6B35]' : 'text-white/40 group-hover:text-white/70')} />
              {label}
              {locked && (
                <span className="ml-auto text-[10px] bg-[#FF6B35]/20 text-[#FF6B35] px-1.5 py-0.5 rounded font-medium">Agence</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer : agence info + settings */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-0.5">
        <Link
          href="/settings/availability"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
            isActive('/settings/availability')
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          )}
        >
          <Clock
            className={cn(
              'w-4 h-4 flex-shrink-0',
              isActive('/settings/availability') ? 'text-[#FF6B35]' : 'text-white/40 group-hover:text-white/70'
            )}
          />
          Disponibilités
          {isActive('/settings/availability') && (
            <ChevronRight className="w-3 h-3 ml-auto text-white/30" />
          )}
        </Link>
        <Link
          href="/settings/referral"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
            isActive('/settings/referral')
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          )}
        >
          <span className="w-4 h-4 flex-none text-center text-xs">🎁</span>
          Parrainage
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
            pathname === '/settings'
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          )}
        >
          <Settings className="w-4 h-4 text-white/40 group-hover:text-white/70" />
          Paramètres
        </Link>

        {/* Badge plan */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <p className="text-white/40 text-xs truncate max-w-[140px]">{agencyName}</p>
          <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full capitalize">
            {plan}
          </span>
        </div>
      </div>
    </aside>
  )
}
