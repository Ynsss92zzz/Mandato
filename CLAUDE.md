@AGENTS.md

# Mandato — SaaS Immobilier IA

Plateforme d'automatisation IA pour agents immobiliers français. Objectif : 10 000€/mois MRR en 12 mois (~80-100 clients).

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js (App Router) | 16.2.4 |
| Language | TypeScript | ^5 |
| UI | Tailwind CSS v4 + shadcn/ui | ^4 |
| Base de données | Supabase (PostgreSQL + Auth + Storage) | latest |
| Paiement | Stripe (abonnements + webhooks) | latest |
| IA | OpenAI API | gpt-4o |
| Emails | Resend | latest |
| SMS / WhatsApp | Twilio | latest |
| RDV | Cal.com (embed + API) | latest |

### Points critiques Next.js 16 (breaking changes vs 14)
- `params` et `searchParams` dans les pages sont des **Promises** → toujours `await params`
- `cookies()` est **async** → `const cookieStore = await cookies()`
- `headers()` est **async** → `const headersList = await headers()`
- Tailwind v4 : configuration dans le CSS via `@theme inline {}` — **pas** de `tailwind.config.ts`
- Server Actions : utiliser `'use server'` en haut du fichier ou de la fonction inline

---

## Plans et limites métier

```ts
// src/constants/plans.ts
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 39,
    limits: {
      leads_per_month: 50,
      agents: 1,
      whatsapp: false,
      sms: false,
      multi_agents: false,
      advanced_analytics: false,
      pdf_reports: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 79,
    limits: {
      leads_per_month: Infinity,
      agents: 1,
      whatsapp: true,
      sms: true,
      multi_agents: false,
      advanced_analytics: false,
      pdf_reports: false,
    },
  },
  agence: {
    id: 'agence',
    name: 'Agence',
    price: 149,
    limits: {
      leads_per_month: Infinity,
      agents: Infinity,
      whatsapp: true,
      sms: true,
      multi_agents: true,
      advanced_analytics: true,
      pdf_reports: true,
    },
  },
}
```

---

## Architecture des dossiers

```
src/
├── app/
│   ├── (auth)/                        # Route group — layout minimaliste
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/                   # Route group — layout avec sidebar
│   │   ├── dashboard/page.tsx         # Métriques principales
│   │   ├── leads/
│   │   │   ├── page.tsx               # Vue kanban + liste
│   │   │   └── [id]/page.tsx          # Fiche lead détaillée
│   │   ├── conversations/page.tsx     # Historique messages
│   │   ├── appointments/page.tsx      # RDV Cal.com
│   │   ├── sequences/
│   │   │   ├── page.tsx               # Liste des séquences
│   │   │   └── [id]/page.tsx          # Éditeur visuel de séquence
│   │   ├── analytics/page.tsx         # Plan Agence uniquement
│   │   ├── team/page.tsx              # Plan Agence uniquement
│   │   ├── settings/
│   │   │   ├── page.tsx               # Paramètres généraux
│   │   │   ├── billing/page.tsx       # Abonnement + facturation
│   │   │   └── integrations/page.tsx  # Cal.com, widget, etc.
│   │   └── layout.tsx                 # Sidebar + header communs
│   ├── (marketing)/                   # Pages publiques
│   │   ├── page.tsx                   # Landing page
│   │   ├── pricing/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/callback/route.ts     # Supabase PKCE OAuth callback
│   │   ├── stripe/
│   │   │   ├── webhooks/route.ts      # Stripe webhook handler
│   │   │   └── create-checkout/route.ts
│   │   ├── leads/
│   │   │   ├── route.ts               # GET list / POST create
│   │   │   └── [id]/route.ts          # GET / PUT / DELETE
│   │   ├── widget/route.ts            # Endpoint public widget embed (CORS ouvert)
│   │   ├── ai/
│   │   │   ├── qualify/route.ts       # POST → qualification lead par Claude
│   │   │   └── draft-message/route.ts # POST → rédaction message par Claude
│   │   ├── sequences/route.ts
│   │   └── webhooks/
│   │       ├── twilio/route.ts        # Réception SMS/WhatsApp entrants
│   │       └── calcom/route.ts        # Events Cal.com (booking créé, annulé)
│   ├── layout.tsx                     # Root layout (fonts, providers)
│   └── globals.css                    # Tailwind v4 + thème Mandato
├── components/
│   ├── ui/                            # shadcn/ui (button, card, input, badge…)
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   ├── sidebar.tsx
│   │   └── top-bar.tsx
│   ├── leads/
│   │   ├── lead-kanban.tsx
│   │   ├── lead-list.tsx
│   │   ├── lead-card.tsx
│   │   ├── lead-form.tsx
│   │   └── lead-detail.tsx
│   ├── sequences/
│   │   └── sequence-editor.tsx
│   └── shared/
│       ├── plan-gate.tsx              # Wrapper qui bloque selon le plan
│       └── upgrade-modal.tsx          # Modal d'incitation à l'upgrade
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # createBrowserClient() — Client Components
│   │   ├── server.ts                  # createServerClient() avec cookies() async
│   │   └── admin.ts                   # createClient(SERVICE_ROLE) — server only
│   ├── stripe/
│   │   └── index.ts                   # Instance Stripe + helpers checkout
│   ├── ai/
│   │   ├── qualify-lead.ts            # Prompt + appel Claude pour qualification
│   │   └── draft-message.ts           # Prompt + appel Claude pour messages
│   ├── resend/
│   │   └── index.ts                   # Instance Resend + templates email
│   ├── twilio/
│   │   └── index.ts                   # Instance Twilio + helpers SMS/WhatsApp
│   └── utils.ts                       # cn(), formatDate(), formatCurrency()
├── hooks/
│   ├── use-user.ts                    # Hook session courante (Client)
│   ├── use-subscription.ts            # Hook plan actif + vérification limites
│   └── use-leads.ts                   # Hook liste leads avec filtres
├── actions/
│   ├── auth.ts                        # signup, login, logout, resetPassword
│   ├── leads.ts                       # createLead, updateLead, deleteLead, qualifyLead
│   └── sequences.ts                   # createSequence, enrollLead, pauseSequence
├── types/
│   ├── database.ts                    # Types générés depuis Supabase CLI
│   └── index.ts                       # Types applicatifs (Lead, Plan, etc.)
├── constants/
│   ├── plans.ts                       # Définition des 3 plans + limites
│   └── routes.ts                      # Constantes des routes de l'app
└── middleware.ts                      # Auth guard + plan enforcement
```

---

## Base de données Supabase

Voir `supabase/schema.sql` pour le schéma complet avec RLS.

### Principe d'isolation multi-tenant
- Chaque compte crée une `agency` (le tenant)
- Toutes les tables métier ont une colonne `agency_id UUID NOT NULL`
- Les RLS policies filtrent systématiquement par `agency_id = auth.uid()` via la fonction `get_my_agency_id()`
- Jamais de requête cross-tenant possible côté base

### Tables

| Table | Description |
|-------|-------------|
| `agencies` | Tenant principal — une agence = un abonnement |
| `profiles` | Extension de `auth.users` — infos publiques |
| `agency_members` | Lien M2M agencies ↔ profiles avec rôle (`owner`, `agent`) |
| `subscriptions` | Abonnement Stripe actif par agence |
| `leads` | Prospects capturés (source, statut, score IA, données contact) |
| `conversations` | Thread de messages par lead |
| `messages` | Messages individuels (email / SMS / WhatsApp / note interne) |
| `appointments` | RDV liés à un lead |
| `sequences` | Séquences de relances automatiques |
| `sequence_steps` | Étapes ordonnées d'une séquence (délai, canal, template) |
| `sequence_enrollments` | Leads inscrits dans une séquence + progression |
| `ai_usage` | Tokens Claude consommés par agence par mois |
| `analytics_events` | Événements bruts pour analytics (lead_created, message_sent, etc.) |
| `widget_configs` | Config du widget embed (couleurs, champs, domaines autorisés) |

---

## Middleware (`src/middleware.ts`)

```
Request → Refresh session Supabase
        → Route publique ? → Passer
        → Route protégée sans session ? → Redirect /login
        → Route /login avec session ? → Redirect /dashboard
        → Route plan-specific (ex: /analytics) ? → Vérifier plan → Redirect /upgrade si insuffisant
```

Routes publiques : `/`, `/pricing`, `/api/widget`, `/api/webhooks/twilio`, `/api/webhooks/calcom`

---

## Authentification

- **Email/password** : Server Actions (`src/actions/auth.ts`)
- **Google OAuth** : `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **Callback PKCE** : `GET /api/auth/callback` → `supabase.auth.exchangeCodeForSession(code)`
- **Session server** : `createServerClient` avec `cookies()` (async dans Next.js 16)
- **Session client** : `createBrowserClient` dans les Client Components

### Triggers PostgreSQL automatiques à l'inscription
1. Créer un `profile` lié à `auth.users.id`
2. Créer une `agency` (nom = email de l'utilisateur)
3. Créer un `agency_member` avec `role = 'owner'`
4. Créer une `subscription` avec `plan = 'starter'`, `status = 'trialing'`

---

## Stripe

### Webhook events gérés (`/api/stripe/webhooks/route.ts`)
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activer l'abonnement, mettre à jour `subscriptions` |
| `customer.subscription.updated` | Changer de plan dans `subscriptions` |
| `customer.subscription.deleted` | Passer en `status = 'canceled'` |
| `invoice.payment_failed` | Notifier par email, grace period 7 jours |

Toujours vérifier la signature avec `stripe.webhooks.constructEvent(rawBody, sig, secret)`.
Le `rawBody` doit être lu **avant** tout parsing JSON (utiliser `request.text()` puis passer à `constructEvent`).

---

## IA — OpenAI

Modèle par défaut : `gpt-4o`

### Qualification de lead
Input : `{ nom, email, telephone, message, source, budget_declare }`
Output JSON (via `response_format: { type: 'json_object' }`) :
```json
{
  "score": 7,
  "intention": "achat",
  "budget_estime": "300000-400000",
  "urgence": "3_mois",
  "profil": "Primo-accédant cherchant T3 en banlieue nord",
  "recommandation": "Appeler rapidement, fort potentiel"
}
```

### Rédaction de message
Input : profil lead + historique conversations + type de canal (email/SMS/WhatsApp)
Output : message personnalisé en français, adapté à la longueur du canal

### Suivi consommation
Table `ai_usage` : tokens consommés par appel, agrégés par `agency_id` et `month`.
Quota alerté à 80% du seuil mensuel estimé (à définir par plan).

---

## Design system

### Couleurs (`globals.css`)
```css
@theme inline {
  --color-navy: #1B2B4B;
  --color-navy-light: #2D4270;
  --color-orange: #FF6B35;
  --color-orange-light: #FF8C5A;
  --color-navy-50: #f0f3f9;
}
```

Classes Tailwind résultantes : `bg-navy`, `text-orange`, `border-navy-light`, etc.

### Typographie
- Police : Inter (via `next/font/google`)
- Headings : `font-semibold tracking-tight text-navy`
- Body : `text-zinc-600`
- Labels : `text-sm font-medium text-zinc-700`

### Composants shadcn/ui à installer
`button`, `card`, `input`, `label`, `badge`, `dialog`, `dropdown-menu`, `select`, `table`, `tabs`, `toast`, `avatar`, `progress`, `separator`, `sheet`, `skeleton`, `command`, `popover`

---

## Sécurité (non négociable)

- Chaque Server Action commence par `const session = await getSession()` → throw si null
- Chaque Route Handler vérifie la session avant toute opération
- Le `SUPABASE_SERVICE_ROLE_KEY` n'est **jamais** exposé côté client
- RLS activé sur **toutes** les tables — le client anon ne peut rien voir sans être authentifié
- Stripe webhooks : vérification signature obligatoire
- Twilio webhooks : vérification signature `X-Twilio-Signature` obligatoire
- CORS : `/api/widget` accepte toutes les origines, les autres routes sont restreintes
- Inputs utilisateur : validation avec Zod côté serveur avant toute insertion DB

---

## Variables d'environnement requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCE_PRICE_ID=

# OpenAI
OPENAI_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@mandato.fr

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# Cal.com
CALCOM_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://app.mandato.fr
```

---

## Conventions de code

- Server Components par défaut — `'use client'` uniquement si état local, effets, ou event handlers côté client
- Data fetching : async Server Components — pas de `useEffect` pour fetcher
- Server Actions dans `src/actions/` avec `'use server'` en haut du fichier
- Nommage : `kebab-case` pour les fichiers, `PascalCase` pour les composants, `camelCase` pour les fonctions
- Types Supabase générés avec `supabase gen types typescript` → `src/types/database.ts`
- Jamais de `any` TypeScript — tout est typé explicitement
- Zod pour valider tous les inputs externes (formulaires, webhooks, API)
