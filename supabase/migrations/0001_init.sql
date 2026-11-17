-- BELAVICA — schéma initial
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > coller > Run.
-- Le site se connecte à la base côté serveur uniquement (DATABASE_URL).
-- Toutes les tables ont RLS activé SANS politique publique : la clé "anon"
-- ne donne accès à aucune donnée via l'API Supabase.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Réglages généraux (une seule ligne)
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id                    int primary key default 1 check (id = 1),
  timezone              text not null default 'Europe/Brussels',
  slot_interval_min     int  not null default 15  check (slot_interval_min between 5 and 120),
  buffer_min            int  not null default 15  check (buffer_min between 0 and 240),
  min_notice_hours      int  not null default 24  check (min_notice_hours between 0 and 720),
  max_days_ahead        int  not null default 60  check (max_days_ahead between 1 and 365),
  deposit_enabled       boolean not null default true,
  deposit_cents         int  not null default 1000 check (deposit_cents >= 0),
  cancellation_hours    int  not null default 48  check (cancellation_hours between 0 and 720),
  notification_email    text not null default 'leona@belavica.com',
  reminders_enabled     boolean not null default false,
  reminder_hours_before int  not null default 24  check (reminder_hours_before between 1 and 168),
  retention_months      int  not null default 36  check (retention_months between 6 and 120),
  max_requests_per_hour int  not null default 5   check (max_requests_per_hour between 1 and 100),
  updated_at            timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- Textes et informations du site modifiables (clé / valeur)
create table if not exists site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Images téléversées depuis l'admin (stockées en base, servies via /media/<id>)
create table if not exists media (
  id           uuid primary key default gen_random_uuid(),
  content_type text not null,
  width        int,
  height       int,
  bytes        bytea not null,
  created_at   timestamptz not null default now()
);

-- Galerie de réalisations
create table if not exists gallery_items (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  alt        text not null default '',
  category   text,
  sort       int  not null default 0,
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  description text not null default '',
  image_url   text,
  sort        int  not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id),
  name         text not null,
  description  text not null default '',
  highlights   text[] not null default '{}',
  note         text not null default '',
  price_cents  int check (price_cents >= 0),
  duration_min int check (duration_min > 0 and duration_min <= 720),
  requires_deposit boolean not null default true, -- acompte demandé pour cette prestation
  -- appointment : créneau réservable ; request : demande de planification (formations) ;
  -- quote : demande de devis (mariage : date, lieu, essai, retouches…)
  booking_mode text not null default 'appointment' check (booking_mode in ('appointment','request','quote')),
  sort         int  not null default 0,
  visible      boolean not null default true,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists services_category_idx on services(category_id);

-- Variantes d'une prestation (ex. renforcement / extension), chacune avec son prix et sa durée
create table if not exists service_variants (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references services(id),
  name         text not null,
  description  text not null default '',
  price_cents  int check (price_cents >= 0),
  duration_min int check (duration_min > 0 and duration_min <= 720),
  sort         int  not null default 0,
  visible      boolean not null default true,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Options (ex. French) avec supplément de prix et de durée
create table if not exists service_options (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  price_cents  int check (price_cents >= 0),
  duration_min int not null default 0 check (duration_min >= 0 and duration_min <= 240),
  active       boolean not null default true,
  sort         int  not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists service_option_links (
  service_id uuid not null references services(id),
  option_id  uuid not null references service_options(id),
  primary key (service_id, option_id)
);

-- ---------------------------------------------------------------------------
-- Disponibilités
-- ---------------------------------------------------------------------------
-- weekday : 1 = lundi … 7 = dimanche (ISO)
create table if not exists working_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 1 and 7),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);

create table if not exists breaks (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 1 and 7),
  start_time time not null,
  end_time   time not null,
  label      text not null default 'Pause',
  check (end_time > start_time)
);

-- Congés, absences et créneaux bloqués
create table if not exists time_off (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'block' check (kind in ('vacation','block')),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists time_off_range_idx on time_off using gist (tstzrange(starts_at, ends_at));

-- ---------------------------------------------------------------------------
-- Clientes et réservations
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text not null,
  notes         text not null default '',   -- notes internes, visibles uniquement dans l'admin
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists clients_email_uidx on clients (lower(email));

create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text not null unique,
  kind                text not null default 'appointment' check (kind in ('appointment','request')),
  status              text not null default 'pending'
                      check (status in ('pending','confirmed','declined','cancelled','completed','no_show')),
  client_id           uuid references clients(id) on delete set null,
  -- instantané de la prestation au moment de la réservation (l'historique reste lisible
  -- même si la prestation est modifiée ou supprimée)
  service_id          uuid references services(id),
  variant_id          uuid references service_variants(id),
  category_name       text not null,
  service_name        text not null,
  variant_name        text,
  options             jsonb not null default '[]',
  starts_at           timestamptz,
  ends_at             timestamptz,
  block_until         timestamptz,       -- fin + temps tampon
  duration_min        int,
  price_cents         int,
  deposit_cents       int not null default 0,
  deposit_status      text not null default 'none'
                      check (deposit_status in ('none','awaiting','received','forfeited','refunded')),
  client_comment      text not null default '',
  preferred_schedule  text not null default '',  -- pour les demandes de formation
  details             jsonb not null default '{}', -- demande de devis mariage
  admin_note          text not null default '',
  source              text not null default 'online' check (source in ('online','admin')),
  cancelled_at        timestamptz,
  cancelled_by        text check (cancelled_by in ('client','admin')),
  cancellation_reason text not null default '',
  late_cancellation   boolean not null default false,
  reminder_sent_at    timestamptz,
  ip_hash             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (kind = 'request' or (starts_at is not null and ends_at is not null and block_until is not null)),
  check (ends_at is null or ends_at > starts_at),
  check (block_until is null or block_until >= ends_at),
  -- Garde-fou ultime contre les doubles réservations : deux rendez-vous actifs
  -- (en attente ou confirmés) ne peuvent jamais se chevaucher, temps tampon inclus.
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, block_until) with &&
  ) where (status in ('pending','confirmed') and starts_at is not null)
);
create index if not exists bookings_starts_idx on bookings(starts_at);
create index if not exists bookings_client_idx on bookings(client_id);
create index if not exists bookings_status_idx on bookings(status);
create index if not exists bookings_created_ip_idx on bookings(ip_hash, created_at);

-- Suivi des e-mails (on n'affiche jamais "envoyé" si l'envoi a échoué)
create table if not exists email_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete set null,
  kind        text not null,
  recipient   text not null,
  status      text not null check (status in ('sent','failed','skipped')),
  provider_id text,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists email_log_booking_idx on email_log(booking_id);

-- Journal des tâches automatiques (purge, rappels, maintien actif)
create table if not exists job_runs (
  id         bigint generated always as identity primary key,
  job        text not null,
  detail     text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sécurité : RLS activé partout, aucune politique pour anon/authenticated.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['settings','site_content','media','gallery_items','categories','services',
    'service_variants','service_options','service_option_links','working_hours','breaks','time_off',
    'clients','bookings','email_log','job_runs']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
  end if;
end $$;
