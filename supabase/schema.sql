-- =============================================================================
-- MANDATO — Schéma PostgreSQL Supabase
-- Exécuter dans l'éditeur SQL Supabase (Dashboard > SQL Editor)
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- recherche full-text sur leads

-- =============================================================================
-- 1b. TYPES ENUM
-- =============================================================================

do $$ begin
  create type plan_id as enum ('starter', 'pro', 'agence');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('nouveau', 'contacte', 'qualifie', 'rdv_planifie', 'proposition', 'gagne', 'perdu');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_source as enum ('widget', 'manuel', 'seloger', 'leboncoin', 'logicimmo', 'import', 'autre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_channel as enum ('email', 'sms', 'whatsapp', 'note');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_direction as enum ('entrant', 'sortant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agency_member_role as enum ('owner', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sequence_status as enum ('actif', 'pause', 'archive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('actif', 'termine', 'stoppe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('planifie', 'confirme', 'annule', 'effectue');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2. TABLES
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.agencies (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  slug                text not null unique,
  owner_id            uuid not null references public.profiles(id),
  stripe_customer_id  text unique,
  logo_url            text,
  website_url         text,
  phone               text,
  address             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.agency_members (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        agency_member_role not null default 'agent',
  invited_by  uuid references public.profiles(id),
  joined_at   timestamptz not null default now(),
  unique (agency_id, profile_id)
);

create table public.subscriptions (
  id                      uuid primary key default uuid_generate_v4(),
  agency_id               uuid not null references public.agencies(id) on delete cascade unique,
  plan                    plan_id not null default 'starter',
  status                  subscription_status not null default 'trialing',
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  trial_ends_at           timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  leads_this_month        integer not null default 0,
  leads_month_reset_at    timestamptz not null default date_trunc('month', now()) + interval '1 month',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.leads (
  id                uuid primary key default uuid_generate_v4(),
  agency_id         uuid not null references public.agencies(id) on delete cascade,
  assigned_to       uuid references public.profiles(id),
  first_name        text not null,
  last_name         text,
  email             text,
  phone             text,
  status            lead_status not null default 'nouveau',
  source            lead_source not null default 'manuel',
  message           text,
  budget            integer,
  property_type     text,
  location_desired  text,
  ai_score          smallint check (ai_score between 1 and 10),
  ai_analysis       jsonb,
  tags              text[] not null default '{}',
  notes             text,
  last_contacted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  channel         message_channel not null,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (lead_id, channel)
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  sender_id       uuid references public.profiles(id),
  channel         message_channel not null,
  direction       message_direction not null default 'sortant',
  content         text not null,
  subject         text,
  is_ai_generated boolean not null default false,
  external_id     text,
  status          text not null default 'sent',
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create table public.appointments (
  id           uuid primary key default uuid_generate_v4(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  lead_id      uuid not null references public.leads(id) on delete cascade,
  agent_id     uuid references public.profiles(id),
  title        text not null,
  description  text,
  status       appointment_status not null default 'planifie',
  scheduled_at timestamptz not null,
  duration_min integer not null default 60,
  location     text,
  calcom_uid   text unique,
  calcom_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.sequences (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  name        text not null,
  description text,
  status      sequence_status not null default 'actif',
  trigger_on  text not null default 'lead_created',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.sequence_steps (
  id               uuid primary key default uuid_generate_v4(),
  sequence_id      uuid not null references public.sequences(id) on delete cascade,
  agency_id        uuid not null references public.agencies(id) on delete cascade,
  step_order       smallint not null,
  delay_hours      numeric(10,4) not null default 24,
  channel          message_channel not null,
  subject          text,
  content_template text not null,
  is_ai_generated  boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (sequence_id, step_order)
);

create table public.sequence_enrollments (
  id           uuid primary key default uuid_generate_v4(),
  sequence_id  uuid not null references public.sequences(id) on delete cascade,
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  lead_id      uuid not null references public.leads(id) on delete cascade,
  status       enrollment_status not null default 'actif',
  current_step smallint not null default 0,
  next_step_at timestamptz,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (sequence_id, lead_id)
);

create table public.ai_usage (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  month         date not null,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  request_count integer not null default 0,
  updated_at    timestamptz not null default now(),
  unique (agency_id, month)
);

create table public.analytics_events (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  event_type  text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  occurred_at timestamptz not null default now()
);

create table public.widget_configs (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references public.agencies(id) on delete cascade unique,
  primary_color   text not null default '#FF6B35',
  button_text     text not null default 'Être rappelé',
  title           text not null default 'Contactez-nous',
  fields          jsonb not null default '["first_name","email","phone","message"]',
  allowed_domains text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- 3. INDEX
-- =============================================================================

create index leads_agency_id_idx on public.leads(agency_id);
create index leads_status_idx on public.leads(agency_id, status);
create index leads_assigned_to_idx on public.leads(assigned_to);
create index leads_created_at_idx on public.leads(agency_id, created_at desc);

create index conversations_agency_id_idx on public.conversations(agency_id);
create index conversations_lead_id_idx on public.conversations(lead_id);

create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_lead_id_idx on public.messages(lead_id);
create index messages_agency_id_idx on public.messages(agency_id);

create index appointments_agency_id_idx on public.appointments(agency_id);
create index appointments_lead_id_idx on public.appointments(lead_id);
create index appointments_scheduled_at_idx on public.appointments(agency_id, scheduled_at);

create index enrollments_agency_id_idx on public.sequence_enrollments(agency_id);
create index enrollments_next_step_at_idx on public.sequence_enrollments(next_step_at)
  where status = 'actif';

create index analytics_events_agency_idx on public.analytics_events(agency_id, occurred_at desc);
create index analytics_events_type_idx on public.analytics_events(agency_id, event_type, occurred_at desc);

-- =============================================================================
-- 4. VUES
-- =============================================================================

create or replace view public.lead_stats as
select
  agency_id,
  count(*) as total,
  count(*) filter (where status = 'nouveau') as nouveaux,
  count(*) filter (where status = 'qualifie') as qualifies,
  count(*) filter (where status = 'rdv_planifie') as rdv_planifies,
  count(*) filter (where status = 'gagne') as gagnes,
  count(*) filter (where date_trunc('day', created_at) = date_trunc('day', now())) as today,
  round(
    count(*) filter (where status = 'gagne')::numeric
    / nullif(count(*), 0) * 100, 1
  ) as conversion_rate
from public.leads
group by agency_id;

-- =============================================================================
-- 5. FONCTIONS ET TRIGGERS
-- =============================================================================

-- Mise à jour automatique de updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger agencies_updated_at before update on public.agencies
  for each row execute function public.handle_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.handle_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.handle_updated_at();
create trigger sequences_updated_at before update on public.sequences
  for each row execute function public.handle_updated_at();
create trigger widget_configs_updated_at before update on public.widget_configs
  for each row execute function public.handle_updated_at();

-- Retourne l'agency_id du user courant (utilisé par les RLS policies)
create or replace function public.get_my_agency_id()
returns uuid
language sql
security definer
stable
as $$
  select agency_id
  from public.agency_members
  where profile_id = auth.uid()
  limit 1;
$$;

-- Création automatique du profil + agence + membre + abonnement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_agency_id uuid;
  v_slug text;
begin
  -- 1. Créer le profil
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Générer un slug unique pour l'agence
  v_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  )) || '-' || substr(new.id::text, 1, 8);

  -- 3. Créer l'agence
  insert into public.agencies (name, slug, owner_id)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_slug,
    new.id
  )
  returning id into v_agency_id;

  -- 4. Créer le membre (owner)
  insert into public.agency_members (agency_id, profile_id, role)
  values (v_agency_id, new.id, 'owner');

  -- 5. Créer l'abonnement (trial 14 jours)
  insert into public.subscriptions (agency_id, plan, status, trial_ends_at)
  values (v_agency_id, 'starter', 'trialing', now() + interval '14 days');

  -- 6. Créer la config widget par défaut
  insert into public.widget_configs (agency_id)
  values (v_agency_id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Incrémenter le compteur de leads du mois sur l'abonnement
create or replace function public.handle_new_lead()
returns trigger language plpgsql security definer as $$
begin
  update public.subscriptions
  set leads_this_month = leads_this_month + 1
  where agency_id = new.agency_id;

  insert into public.analytics_events (agency_id, event_type, entity_type, entity_id, metadata)
  values (new.agency_id, 'lead_created', 'lead', new.id,
    jsonb_build_object('source', new.source, 'status', new.status));

  return new;
end;
$$;

create trigger on_lead_created
  after insert on public.leads
  for each row execute function public.handle_new_lead();

-- Réinitialiser le compteur de leads en début de mois (appeler via pg_cron)
create or replace function public.reset_monthly_lead_counts()
returns void language plpgsql security definer as $$
begin
  update public.subscriptions
  set leads_this_month = 0,
      leads_month_reset_at = date_trunc('month', now()) + interval '1 month'
  where leads_month_reset_at <= now();
end;
$$;

-- =============================================================================
-- 6. POLITIQUES RLS
-- =============================================================================

alter table public.profiles enable row level security;

create policy "Lecture propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Mise à jour propre profil"
  on public.profiles for update
  using (auth.uid() = id);

alter table public.agencies enable row level security;

create policy "Membres peuvent lire leur agence"
  on public.agencies for select
  using (id = public.get_my_agency_id());

create policy "Owner peut modifier son agence"
  on public.agencies for update
  using (owner_id = auth.uid());

alter table public.agency_members enable row level security;

create policy "Membres peuvent voir les membres de leur agence"
  on public.agency_members for select
  using (agency_id = public.get_my_agency_id());

create policy "Owner peut inviter des membres"
  on public.agency_members for insert
  with check (
    agency_id = public.get_my_agency_id()
    and exists (
      select 1 from public.agency_members
      where agency_id = public.get_my_agency_id()
        and profile_id = auth.uid()
        and role = 'owner'
    )
  );

alter table public.subscriptions enable row level security;

create policy "Membres peuvent lire leur abonnement"
  on public.subscriptions for select
  using (agency_id = public.get_my_agency_id());

alter table public.leads enable row level security;

create policy "Membres voient les leads de leur agence"
  on public.leads for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent créer des leads"
  on public.leads for insert
  with check (agency_id = public.get_my_agency_id());

create policy "Membres peuvent modifier les leads"
  on public.leads for update
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent supprimer les leads"
  on public.leads for delete
  using (agency_id = public.get_my_agency_id());

alter table public.conversations enable row level security;

create policy "Membres voient les conversations de leur agence"
  on public.conversations for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent créer des conversations"
  on public.conversations for insert
  with check (agency_id = public.get_my_agency_id());

alter table public.messages enable row level security;

create policy "Membres voient les messages de leur agence"
  on public.messages for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent créer des messages"
  on public.messages for insert
  with check (agency_id = public.get_my_agency_id());

alter table public.appointments enable row level security;

create policy "Membres voient les RDV de leur agence"
  on public.appointments for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent créer des RDV"
  on public.appointments for insert
  with check (agency_id = public.get_my_agency_id());

create policy "Membres peuvent modifier les RDV"
  on public.appointments for update
  using (agency_id = public.get_my_agency_id());

alter table public.sequences enable row level security;

create policy "Membres voient les séquences de leur agence"
  on public.sequences for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent gérer les séquences"
  on public.sequences for all
  using (agency_id = public.get_my_agency_id());

alter table public.sequence_steps enable row level security;

create policy "Membres voient les étapes de leur agence"
  on public.sequence_steps for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent gérer les étapes"
  on public.sequence_steps for all
  using (agency_id = public.get_my_agency_id());

alter table public.sequence_enrollments enable row level security;

create policy "Membres voient les inscriptions de leur agence"
  on public.sequence_enrollments for select
  using (agency_id = public.get_my_agency_id());

alter table public.ai_usage enable row level security;

create policy "Membres voient leur consommation IA"
  on public.ai_usage for select
  using (agency_id = public.get_my_agency_id());

alter table public.analytics_events enable row level security;

create policy "Membres voient leurs analytics"
  on public.analytics_events for select
  using (agency_id = public.get_my_agency_id());

create policy "Service peut insérer des events"
  on public.analytics_events for insert
  with check (agency_id = public.get_my_agency_id());

alter table public.widget_configs enable row level security;

create policy "Membres voient leur config widget"
  on public.widget_configs for select
  using (agency_id = public.get_my_agency_id());

create policy "Membres peuvent modifier leur config widget"
  on public.widget_configs for all
  using (agency_id = public.get_my_agency_id());
