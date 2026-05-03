import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/register', '/login'],
        disallow: [
          '/dashboard',
          '/leads',
          '/conversations',
          '/appointments',
          '/sequences',
          '/analytics',
          '/team',
          '/settings',
          '/onboarding',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
