import type { NextConfig } from 'next'

function parseHostname(raw: string | undefined): string {
  try {
    if (!raw) return '*.supabase.co'
    return new URL(raw).hostname
  } catch {
    return '*.supabase.co'
  }
}

const supabaseHostname = parseHostname(process.env.NEXT_PUBLIC_SUPABASE_URL)

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for styles and eval for hot reload
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://${supabaseHostname} https://lh3.googleusercontent.com`,
      `connect-src 'self' https://${supabaseHostname} wss://${supabaseHostname} https://api.stripe.com https://api.openai.com https://api.resend.com https://*.twilio.com`,
      "frame-src https://js.stripe.com https://cal.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Don't leak Next.js version to attackers
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Security headers on all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // CORS: only /api/widget is public
      {
        source: '/api/widget(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },

  // Optimise images from Supabase storage and Google avatars
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Redirect http → https in prod is handled by Vercel, but add www → apex redirect
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },


}

export default nextConfig
