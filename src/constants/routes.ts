export const ROUTES = {
  // Marketing
  home: '/',
  pricing: '/pricing',

  // Auth
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  // Dashboard
  dashboard: '/dashboard',
  leads: '/leads',
  lead: (id: string) => `/leads/${id}`,
  conversations: '/conversations',
  appointments: '/appointments',
  sequences: '/sequences',
  sequence: (id: string) => `/sequences/${id}`,
  templates: '/sequences/templates',
  analytics: '/analytics',
  team: '/team',
  settings: '/settings',
  settingsBilling: '/settings/billing',
  settingsIntegrations: '/settings/integrations',
  settingsReferral: '/settings/referral',
  onboarding: '/onboarding',
} as const

export const PUBLIC_ROUTES = ['/', '/pricing', '/login', '/register', '/forgot-password']
export const PUBLIC_PREFIXES = ['/booking/']

export const AGENCE_ONLY_ROUTES = ['/analytics', '/team']
