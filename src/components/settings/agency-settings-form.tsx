'use client'

import { useState, useTransition } from 'react'
import { Building2, User, Globe, Phone, MapPin, Lock, Save, CheckCircle, Mail, X, Bell } from 'lucide-react'
import { updateAgencySettings, updateNotificationPreferences, updateProfileSettings } from '@/actions/settings'
import { createClient } from '@/lib/supabase/client'

interface AgencyData {
  name: string
  slug: string
  logo_url: string | null
  website_url: string | null
  phone: string | null
  address: string | null
  inbound_email: string | null
}

interface ProfileData {
  full_name: string
  email: string
  avatar_url: string | null
}

interface NotifPrefs {
  notif_morning_briefing: boolean
  notif_weekly_report: boolean
  notif_hot_leads: boolean
}

interface Props {
  agencyId: string
  userId: string
  isOwner: boolean
  initialAgency: AgencyData
  initialProfile: ProfileData
  initialNotifPrefs: NotifPrefs
}

function Field({
  label, name, value, onChange, type = 'text', placeholder, disabled, icon: Icon,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  icon?: React.ElementType
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border border-zinc-200 rounded-xl py-2.5 text-sm outline-none transition
            focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]
            disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed
            ${Icon ? 'pl-9 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  )
}

function Toggle({
  label, description, checked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-zinc-50 last:border-0">
      <div className="pr-6">
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-[#1B2B4B]' : 'bg-zinc-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function SaveButton({ isPending, saved }: { isPending: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex items-center gap-2 bg-[#1B2B4B] hover:bg-[#2D4270] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
    >
      {isPending ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Enregistrement…
        </>
      ) : saved ? (
        <>
          <CheckCircle className="w-4 h-4" />
          Enregistré
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Enregistrer
        </>
      )}
    </button>
  )
}

export function AgencySettingsForm({ agencyId, isOwner, initialAgency, initialProfile, initialNotifPrefs }: Props) {
  const [agency, setAgency] = useState<AgencyData>(initialAgency)
  const [profile, setProfile] = useState<ProfileData>(initialProfile)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(initialNotifPrefs)
  const [agencySaved, setAgencySaved] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [agencyError, setAgencyError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [agencyPending, startAgencyTransition] = useTransition()
  const [profilePending, startProfileTransition] = useTransition()
  const [notifPending, startNotifTransition] = useTransition()

  const [emailChangeMode, setEmailChangeMode] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailChangePending, startEmailChangeTransition] = useTransition()
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<string | null>(null)
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null)

  function handleAgencySubmit(e: React.FormEvent) {
    e.preventDefault()
    setAgencyError(null)
    startAgencyTransition(async () => {
      const fd = new FormData()
      Object.entries(agency).forEach(([k, v]) => fd.set(k, v ?? ''))
      fd.set('agency_id', agencyId)
      const result = await updateAgencySettings(fd)
      if (result?.error) {
        setAgencyError(result.error)
      } else {
        setAgencySaved(true)
        setTimeout(() => setAgencySaved(false), 3000)
      }
    })
  }

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    startProfileTransition(async () => {
      const fd = new FormData()
      Object.entries(profile).forEach(([k, v]) => fd.set(k, v ?? ''))
      const result = await updateProfileSettings(fd)
      if (result?.error) {
        setProfileError(result.error)
      } else {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
      }
    })
  }

  function handleNotifSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotifError(null)
    startNotifTransition(async () => {
      const fd = new FormData()
      fd.set('notif_morning_briefing', String(notifPrefs.notif_morning_briefing))
      fd.set('notif_weekly_report',    String(notifPrefs.notif_weekly_report))
      fd.set('notif_hot_leads',        String(notifPrefs.notif_hot_leads))
      const result = await updateNotificationPreferences(fd)
      if (result?.error) {
        setNotifError(result.error)
      } else {
        setNotifSaved(true)
        setTimeout(() => setNotifSaved(false), 3000)
      }
    })
  }

  function handleEmailChange() {
    setEmailChangeError(null)
    setEmailChangeSuccess(null)
    const trimmed = newEmail.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailChangeError('Veuillez saisir une adresse email valide.')
      return
    }
    startEmailChangeTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/settings` },
      )
      if (error) {
        if (error.message.toLowerCase().includes('already')) {
          setEmailChangeError('Cette adresse email est déjà utilisée.')
        } else {
          setEmailChangeError(error.message)
        }
      } else {
        setEmailChangeSuccess(trimmed)
        setEmailChangeMode(false)
        setNewEmail('')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Agency settings */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f0f3f9] rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#1B2B4B]" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Informations de l&apos;agence</h2>
            <p className="text-xs text-zinc-400">
              {isOwner ? 'Modifiez les informations de votre agence' : 'Seul le propriétaire peut modifier ces informations'}
            </p>
          </div>
          {!isOwner && (
            <Lock className="w-4 h-4 text-zinc-300 ml-auto" />
          )}
        </div>

        <form onSubmit={handleAgencySubmit} className="p-6 space-y-4">
          {agencyError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {agencyError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nom de l'agence"
              name="name"
              value={agency.name}
              onChange={(v) => setAgency((a) => ({ ...a, name: v }))}
              placeholder="Agence Martin"
              disabled={!isOwner}
              icon={Building2}
            />
            <Field
              label="Identifiant unique (slug)"
              name="slug"
              value={agency.slug}
              onChange={(v) => setAgency((a) => ({ ...a, slug: v }))}
              placeholder="agence-martin"
              disabled={!isOwner}
            />
            <Field
              label="Site web"
              name="website_url"
              value={agency.website_url ?? ''}
              onChange={(v) => setAgency((a) => ({ ...a, website_url: v || null }))}
              placeholder="https://www.votre-agence.fr"
              type="url"
              disabled={!isOwner}
              icon={Globe}
            />
            <Field
              label="Téléphone"
              name="phone"
              value={agency.phone ?? ''}
              onChange={(v) => setAgency((a) => ({ ...a, phone: v || null }))}
              placeholder="+33 1 23 45 67 89"
              type="tel"
              disabled={!isOwner}
              icon={Phone}
            />
          </div>

          <Field
            label="Adresse"
            name="address"
            value={agency.address ?? ''}
            onChange={(v) => setAgency((a) => ({ ...a, address: v || null }))}
            placeholder="12 rue de la Paix, 75001 Paris"
            disabled={!isOwner}
            icon={MapPin}
          />

          <div>
            <Field
              label="Email entrant (pour recevoir les leads)"
              name="inbound_email"
              value={agency.inbound_email ?? ''}
              onChange={(v) => setAgency((a) => ({ ...a, inbound_email: v || null }))}
              placeholder="leads@votre-agence.fr"
              type="email"
              disabled={!isOwner}
              icon={Mail}
            />
            <p className="text-xs text-zinc-400 mt-1.5">
              Configurez cette adresse dans votre gestionnaire d&apos;emails (redirection ou alias). Les emails reçus ici seront automatiquement créés comme leads.
            </p>
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logo_url" className="block text-sm font-medium text-zinc-700 mb-1.5">
              URL du logo
            </label>
            <div className="flex items-center gap-3">
              {agency.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agency.logo_url}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-contain border border-zinc-200 bg-zinc-50 p-1"
                />
              )}
              <input
                id="logo_url"
                name="logo_url"
                type="url"
                value={agency.logo_url ?? ''}
                onChange={(e) => setAgency((a) => ({ ...a, logo_url: e.target.value || null }))}
                placeholder="https://..."
                disabled={!isOwner}
                className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B] disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-2">
              <SaveButton isPending={agencyPending} saved={agencySaved} />
            </div>
          )}
        </form>
      </section>

      {/* Profile settings */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f0f3f9] rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-[#1B2B4B]" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Votre profil</h2>
            <p className="text-xs text-zinc-400">Informations affichées à vos collègues</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
          {profileError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {profileError}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#1B2B4B] flex items-center justify-center text-white text-xl font-bold flex-none">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? profile.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <input
                type="url"
                value={profile.avatar_url ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value || null }))}
                placeholder="URL de votre photo de profil (optionnel)"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
              />
              <p className="text-xs text-zinc-400 mt-1">Collez l&apos;URL de votre photo (recommandé : carré 200×200px)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nom complet"
              name="full_name"
              value={profile.full_name}
              onChange={(v) => setProfile((p) => ({ ...p, full_name: v }))}
              placeholder="Jean Dupont"
              icon={User}
            />
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full border border-zinc-200 rounded-xl py-2.5 pl-9 pr-4 text-sm bg-zinc-50 text-zinc-400 cursor-default outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setEmailChangeMode((m) => !m); setEmailChangeError(null); setEmailChangeSuccess(null); setNewEmail('') }}
                  className="shrink-0 text-sm font-medium text-[#1B2B4B] hover:text-[#2D4270] border border-zinc-200 hover:border-[#1B2B4B]/30 px-3 py-2.5 rounded-xl transition-colors"
                >
                  {emailChangeMode ? <X className="w-4 h-4" /> : 'Changer'}
                </button>
              </div>
            </div>
          </div>

          {emailChangeMode && (
            <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-zinc-50">
              <p className="text-sm font-medium text-zinc-700">Nouvelle adresse email</p>
              {emailChangeError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-3 py-2">
                  {emailChangeError}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEmailChange() } }}
                  placeholder="nouvelle@adresse.fr"
                  autoFocus
                  className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
                />
                <button
                  type="button"
                  onClick={handleEmailChange}
                  disabled={emailChangePending}
                  className="inline-flex items-center gap-2 bg-[#1B2B4B] hover:bg-[#2D4270] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  {emailChangePending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirmer'
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-400">Un email de confirmation vous sera envoyé. L&apos;adresse ne changera qu&apos;après avoir cliqué sur le lien.</p>
            </div>
          )}

          {emailChangeSuccess && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Un email de confirmation a été envoyé à <strong>{emailChangeSuccess}</strong>. Cliquez sur le lien pour confirmer le changement.</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <SaveButton isPending={profilePending} saved={profileSaved} />
          </div>
        </form>
      </section>

      {/* Notification preferences */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f0f3f9] rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-[#1B2B4B]" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Notifications</h2>
            <p className="text-xs text-zinc-400">Choisissez les emails automatiques que vous souhaitez recevoir</p>
          </div>
        </div>

        <form onSubmit={handleNotifSubmit} className="px-6 pt-2 pb-6">
          {notifError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {notifError}
            </div>
          )}

          <Toggle
            label="Briefing matinal"
            description="Résumé des RDV du jour, leads chauds et statistiques — tous les matins à 9h"
            checked={notifPrefs.notif_morning_briefing}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, notif_morning_briefing: v }))}
          />
          <Toggle
            label="Rapport hebdomadaire"
            description="Bilan de la semaine : leads, messages envoyés, RDV — chaque lundi matin"
            checked={notifPrefs.notif_weekly_report}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, notif_weekly_report: v }))}
          />
          <Toggle
            label="Alertes leads chauds"
            description="Section leads prioritaires incluse dans le briefing matinal (score IA > 7)"
            checked={notifPrefs.notif_hot_leads}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, notif_hot_leads: v }))}
          />

          <div className="flex justify-end pt-4">
            <SaveButton isPending={notifPending} saved={notifSaved} />
          </div>
        </form>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-xl border border-red-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="font-semibold text-red-700">Zone de danger</h2>
          <p className="text-xs text-red-400 mt-0.5">Ces actions sont irréversibles</p>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-700">Se déconnecter</p>
            <p className="text-xs text-zinc-400">Ferme votre session sur cet appareil</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
