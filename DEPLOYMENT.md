# Guide de déploiement — Mandato

## Vue d'ensemble

```
GitHub repo → Vercel (Next.js)  ←→  Supabase (DB + Auth + Storage)
                    ↕                         ↕
               Stripe (paiements)       Resend (emails)
               Twilio (SMS/WhatsApp)    OpenAI (IA)
               Cal.com (RDV)
```

---

## 1. Prérequis

| Service | Compte requis | Plan minimum |
|---------|--------------|--------------|
| [Supabase](https://supabase.com) | Gratuit | Free (puis Pro en production) |
| [Vercel](https://vercel.com) | Gratuit | Hobby (puis Pro pour les crons) |
| [Stripe](https://stripe.com) | Gratuit | Payant à l'usage |
| [Resend](https://resend.com) | Gratuit | Free (100 emails/jour) |
| [OpenAI](https://platform.openai.com) | Payant | Pay-as-you-go |
| [Twilio](https://twilio.com) | Payant | Pay-as-you-go |
| [Cal.com](https://cal.com) | Gratuit | Free ou Teams |

---

## 2. Base de données Supabase

### 2a. Créer le projet

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Choisir la région **West EU (Paris)** pour minimiser la latence
3. Notez le **Project URL** et les clés API

### 2b. Exécuter le schéma

Dans **SQL Editor** du projet Supabase :

```sql
-- Étape 1 : Schéma principal
-- Copier-coller le contenu de supabase/schema.sql
-- Puis cliquer sur Run

-- Étape 2 : Migration Phase 6 (onboarding + parrainage)
-- Copier-coller le contenu de supabase/migrations/001_referrals.sql
-- Puis cliquer sur Run
```

### 2c. Configurer l'authentification

Dans **Authentication > Providers** :

- **Email** : activer, désactiver "Confirm email" pour les tests (réactiver en prod)
- **Google** : activer OAuth avec les Client ID/Secret de Google Cloud Console
  - Authorized redirect URI : `https://[project-ref].supabase.co/auth/v1/callback`

Dans **Authentication > URL Configuration** :
- Site URL : `https://app.mandato.fr`
- Redirect URLs : `https://app.mandato.fr/api/auth/callback`

### 2d. Configurer le Storage (optionnel pour les avatars)

Dans **Storage** → créer un bucket `avatars` avec accès public.

---

## 3. Stripe

### 3a. Créer les produits

Dans **Products** → créer 3 produits récurrents (mensuels) :

| Produit | Prix | Description |
|---------|------|-------------|
| Mandato Starter | 39€/mois | Plan Starter |
| Mandato Pro | 79€/mois | Plan Pro |
| Mandato Agence | 149€/mois | Plan Agence |

Notez les **Price IDs** (`price_xxx`) pour chaque produit.

### 3b. Configurer le webhook (après déploiement)

Dans **Developers > Webhooks** → **Add endpoint** :

- **URL** : `https://app.mandato.fr/api/stripe/webhooks`
- **Events à écouter** :
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copiez le **Signing secret** (`whsec_xxx`) → variable `STRIPE_WEBHOOK_SECRET`.

### 3c. Clés API

- Mode **Test** pour le développement (`sk_test_...`, `pk_test_...`)
- Mode **Live** pour la production (`sk_live_...`, `pk_live_...`)

---

## 4. Resend (emails)

1. Aller sur [resend.com](https://resend.com) → **API Keys** → créer une clé
2. **Domains** → ajouter `mandato.fr` → suivre les instructions DNS (MX, SPF, DKIM)
3. Une fois vérifié, utiliser `noreply@mandato.fr` comme expéditeur

---

## 5. Twilio (SMS et WhatsApp)

### SMS

1. Acheter un numéro de téléphone français dans **Phone Numbers**
2. Configurer le webhook entrant :
   - **Messaging > Phone Numbers** → sélectionner le numéro
   - Webhook URL : `https://app.mandato.fr/api/webhooks/twilio`
   - Méthode : `POST`

### WhatsApp Business

1. **Messaging > Senders > WhatsApp Senders** → connecter un numéro Business
2. Configurer le même webhook URL ci-dessus

---

## 6. Cal.com

1. **Settings > Developer > API Keys** → créer une clé
2. **Settings > Webhooks** → Add webhook :
   - URL : `https://app.mandato.fr/api/webhooks/calcom`
   - Events : `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`

---

## 7. Déploiement sur Vercel

### 7a. Import du projet

```bash
# Option A : via Vercel CLI
npm i -g vercel
vercel login
vercel --prod

# Option B : via GitHub
# 1. Pousser le code sur GitHub
# 2. vercel.com/new → Import Git Repository
# 3. Sélectionner le repo mandato
```

### 7b. Variables d'environnement

Dans **Vercel > Settings > Environment Variables**, ajouter **toutes** les variables du fichier `.env.example` :

```
NEXT_PUBLIC_SUPABASE_URL          → Production
NEXT_PUBLIC_SUPABASE_ANON_KEY     → Production
SUPABASE_SERVICE_ROLE_KEY         → Production (sensitive)
STRIPE_SECRET_KEY                 → Production (sensitive)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → Production
STRIPE_WEBHOOK_SECRET             → Production (sensitive)
STRIPE_STARTER_PRICE_ID           → Production
STRIPE_PRO_PRICE_ID               → Production
STRIPE_AGENCE_PRICE_ID            → Production
OPENAI_API_KEY                    → Production (sensitive)
RESEND_API_KEY                    → Production (sensitive)
RESEND_FROM_EMAIL                 → Production
TWILIO_ACCOUNT_SID                → Production
TWILIO_AUTH_TOKEN                 → Production (sensitive)
TWILIO_PHONE_NUMBER               → Production
TWILIO_WHATSAPP_NUMBER            → Production
CALCOM_API_KEY                    → Production
NEXT_PUBLIC_APP_URL               → https://app.mandato.fr
CRON_SECRET                       → Production (sensitive, générer avec openssl rand -base64 32)
```

> ⚠️ Les variables **sensitive** ne doivent jamais apparaître dans les logs ou les builds.
> Activer **Sensitive** dans l'interface Vercel pour ces variables.

### 7c. Domaine personnalisé

Dans **Vercel > Settings > Domains** :
1. Ajouter `app.mandato.fr`
2. Configurer le DNS chez votre registrar :
   ```
   CNAME  app  cname.vercel-dns.com
   ```
3. Vercel génère automatiquement un certificat SSL/TLS (Let's Encrypt)

### 7d. Régions et Runtime

Le fichier `vercel.json` configure :
- **Région** : `cdg1` (Paris, France) pour minimiser la latence avec Supabase EU
- **Crons** : `/api/cron/sequences` toutes les 15 minutes, `/api/cron/reset-leads` le 1er du mois

> ℹ️ Les crons Vercel nécessitent le plan **Pro** ou **Enterprise**.

---

## 8. Configuration post-déploiement

### 8a. Vérifier le webhook Stripe

```bash
# Tester localement avec Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Déclencher un événement de test
stripe trigger checkout.session.completed
```

### 8b. Vérifier la santé de l'application

```bash
curl https://app.mandato.fr/api/health
# Réponse attendue : {"status":"ok","db":"connected","latency_ms":42}
```

### 8c. Tester le flux complet

1. Créer un compte sur `https://app.mandato.fr/register`
2. Vérifier l'email de confirmation
3. Compléter l'onboarding
4. Créer un lead manuellement
5. Lancer la qualification IA
6. Envoyer un email de test
7. Vérifier dans Resend que l'email est parti

---

## 9. Variables par environnement

| Variable | Dev | Preview | Production |
|----------|-----|---------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL Vercel preview | `https://app.mandato.fr` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | CLI local | Webhook preview | Webhook prod |
| Supabase | Projet dev | Projet dev ou staging | Projet prod |

---

## 10. Checklist de mise en ligne

### Avant le déploiement
- [ ] `npm run build` passe sans erreurs
- [ ] `npx tsc --noEmit` passe sans erreurs
- [ ] Toutes les variables d'environnement sont configurées dans Vercel
- [ ] Le schéma SQL a été exécuté sur le projet Supabase de production
- [ ] La migration `001_referrals.sql` a été exécutée
- [ ] RLS activé sur toutes les tables (vérifier dans Table Editor > chaque table)
- [ ] Le domaine `mandato.fr` est vérifié dans Resend

### Stripe
- [ ] Produits créés avec les bons prix
- [ ] Webhook configuré sur l'URL de production
- [ ] Tous les Price IDs copiés dans les variables d'environnement
- [ ] Test d'un checkout complet en mode Live

### Auth Supabase
- [ ] Confirm email activé en production
- [ ] URL de redirection configurée : `https://app.mandato.fr/api/auth/callback`
- [ ] Google OAuth configuré (si souhaité)

### Monitoring
- [ ] Configurer des alertes Vercel (erreurs 5xx, latence)
- [ ] Configurer des alertes Supabase (usage DB, storage)
- [ ] Vérifier les logs Vercel après le premier déploiement

### SEO
- [ ] `https://app.mandato.fr/sitemap.xml` accessible
- [ ] `https://app.mandato.fr/robots.txt` accessible
- [ ] OpenGraph tags vérifiés avec [opengraph.xyz](https://www.opengraph.xyz)
- [ ] Soumettre le sitemap à Google Search Console

---

## 11. Commandes utiles

```bash
# Développement local
npm run dev

# Build de production
npm run build && npm run start

# Vérification TypeScript
npx tsc --noEmit

# Linter
npm run lint

# Déploiement Vercel
vercel --prod

# Logs Vercel en temps réel
vercel logs --follow

# Test webhook Stripe en local
stripe listen --forward-to localhost:3000/api/stripe/webhooks
stripe trigger checkout.session.completed

# Régénérer les types Supabase (après modifications du schéma)
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

---

## 12. Architecture de production

```
┌─────────────────────────────────────────┐
│              Vercel Edge Network         │
│  CDN + SSL + Load balancing automatique │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Next.js App (cdg1 / Paris)      │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ App Router  │  │  API Routes      │  │
│  │ SSR + RSC   │  │  Webhooks/Crons  │  │
│  └─────────────┘  └──────────────────┘  │
└──┬─────────────────────────┬────────────┘
   │                         │
┌──▼──────────┐  ┌───────────▼────────────┐
│  Supabase   │  │   Services externes    │
│  (EU West)  │  │  Stripe / OpenAI /     │
│  Postgres   │  │  Resend / Twilio /     │
│  Auth       │  │  Cal.com               │
│  Storage    │  └────────────────────────┘
└─────────────┘
```
