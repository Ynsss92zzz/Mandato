import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Mandato — Automatisation IA pour agents immobiliers',
    template: '%s | Mandato',
  },
  description: "Qualifiez vos leads, automatisez vos relances et signez plus de mandats avec l'IA.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mandato',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-white text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  )
}
