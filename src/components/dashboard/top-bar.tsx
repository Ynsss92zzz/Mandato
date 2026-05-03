'use client'

import { logout } from '@/actions/auth'
import { LogOut, Bell, User } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface TopBarProps {
  userName: string
  userEmail: string
  pageTitle?: string
}

export function TopBar({ userName, userEmail, pageTitle }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-zinc-100 flex items-center justify-between px-6 flex-shrink-0">
      {pageTitle ? (
        <h1 className="text-base font-semibold text-navy">{pageTitle}</h1>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        {/* Notifications — placeholder */}
        <button className="relative p-2 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-600">
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar + déconnexion */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center flex-shrink-0">
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
