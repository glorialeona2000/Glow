-- BELAVICA — installation complète de la base (à coller en une fois dans Supabase > SQL Editor > Run).
-- Généré à partir de supabase/migrations/0001_init.sql et 0002_seed.sql.

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
  deposit_enabled       boolean not null default false, -- pas d'acompte au lancement (activable dans l'admin)
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

-- BELAVICA — contenu initial du catalogue.
-- Prix et durées communiqués par Gloria Leona (novembre 2026). Ceux qui n'ont pas encore
-- été communiqués restent vides et se renseignent dans l'admin : une prestation sans prix
-- ou sans durée est affichée mais n'est pas réservable en ligne.

insert into categories (slug, name, tagline, description, image_url, sort) values
 ('make-up', 'Make-up', 'Mise en beauté & formations',
  'Des mises en beauté sur mesure pour vos événements, votre mariage, et des cours pour apprendre à vous sublimer.',
  '/images/maquillage-glam.webp', 1),
 ('lash-brow', 'Lash & Brow', 'Regard sublimé',
  'Rehaussement des cils, restructuration et mise en forme des sourcils pour un regard défini et naturel.',
  '/images/sourcils.webp', 2),
 ('nails', 'Nails', 'Mains soignées',
  'Manucures soignées, semi-permanent et construction en gel pour des ongles élégants et résistants.',
  '/images/ongles-amande.webp', 3),
 ('facial', 'Facial Treatments', 'Soin du visage sur mesure',
  'Un soin du visage entièrement personnalisé, construit après une analyse de peau.',
  '/images/editorial.webp', 4)
on conflict (slug) do nothing;

do $$
declare
  c_make uuid; c_lash uuid; c_nails uuid; c_facial uuid;
  s_classic uuid; s_semi uuid; s_russe uuid; s_event uuid; o_french uuid; o_lashes uuid;
begin
  if exists (select 1 from services) then return; end if;

  select id into c_make   from categories where slug = 'make-up';
  select id into c_lash   from categories where slug = 'lash-brow';
  select id into c_nails  from categories where slug = 'nails';
  select id into c_facial from categories where slug = 'facial';

  insert into services (category_id, name, description, price_cents, duration_min, booking_mode, sort) values
   (c_make, 'Maquillage événementiel', 'Maquillage professionnel personnalisé pour vos événements, soirées, cérémonies et occasions spéciales.', 8000, 75, 'appointment', 1)
   returning id into s_event;

  insert into services (category_id, name, description, note, booking_mode, sort) values
   (c_make, 'Maquillage mariée', 'Mise en beauté personnalisée pour le jour de votre mariage, adaptée à votre style, votre tenue et vos préférences.',
    'Sur devis. Je me déplace sur le lieu de vos préparatifs, y compris en dehors des horaires du studio. Essai, maquillage de vos proches et retouches en soirée sur demande.',
    'quote', 2);

  insert into services (category_id, name, description, booking_mode, sort) values
   (c_make, 'Cours d’auto-maquillage — Day Look', 'Apprenez à réaliser un maquillage de jour naturel, lumineux et élégant. Découvrez les techniques essentielles pour sublimer votre visage au quotidien.', 'appointment', 3),
   (c_make, 'Cours d’auto-maquillage — Day & Night Look', 'Apprenez à réaliser un maquillage de jour et à le transformer en un maquillage de soirée plus sophistiqué. Une formation complète pour maîtriser deux looks et les techniques de transition.', 'appointment', 4);
  update services set price_cents = 12000, duration_min = 180 where name = 'Cours d’auto-maquillage — Day Look';
  update services set price_cents = 16000, duration_min = 240 where name = 'Cours d’auto-maquillage — Day & Night Look';

  insert into services (category_id, name, description, price_cents, note, booking_mode, requires_deposit, sort) values
   (c_make, 'Formation maquillage — 10 heures', 'Programme de formation personnalisé de 10 heures consacré à l’apprentissage et au perfectionnement des techniques de maquillage.', 45000,
    '10 heures réparties sur 5 jours. Envoyez une demande : nous construisons ensemble votre planning. Pas d’acompte : la formation se règle directement.', 'request', false, 5),
   (c_make, 'Formation maquillage — 20 heures', 'Programme approfondi de 20 heures permettant de développer et perfectionner différentes techniques de maquillage à travers un accompagnement personnalisé.', 80000,
    '20 heures réparties sur 10 jours. Envoyez une demande : nous construisons ensemble votre planning. Pas d’acompte : la formation se règle directement.', 'request', false, 6);

  insert into services (category_id, name, description, price_cents, duration_min, sort) values
   (c_lash, 'Lash Lift avec coloration des cils', 'Rehaussement des cils naturels associé à une coloration pour intensifier et définir le regard.', 5500, 50, 1),
   (c_lash, 'Lash Lift sans coloration', 'Rehaussement des cils naturels pour obtenir une courbure élégante et mettre en valeur le regard sans coloration.', 5000, 40, 2),
   (c_lash, 'Brow Lift avec coloration des sourcils', 'Restructuration et discipline des sourcils associées à une coloration pour un résultat défini et harmonieux.', 5500, 50, 3),
   (c_lash, 'Brow Lift sans coloration', 'Restructuration des sourcils pour discipliner les poils et obtenir une ligne harmonieuse et soignée.', 5000, 40, 4),
   (c_lash, 'Épilation et mise en forme des sourcils', 'Épilation et restructuration de la ligne des sourcils selon la morphologie du visage.', 1500, 20, 5);

  insert into services (category_id, name, description, price_cents, duration_min, sort) values
   (c_nails, 'Manucure classique', 'Soin esthétique des mains et des ongles naturels comprenant la préparation des ongles et l’application d’un vernis classique.', 4000, 45, 1)
   returning id into s_classic;
  insert into services (category_id, name, description, price_cents, duration_min, sort) values
   (c_nails, 'Manucure semi-permanente', 'Préparation des ongles naturels et application d’un vernis semi-permanent pour une finition soignée et durable.', 5000, 60, 2)
   returning id into s_semi;
  insert into services (category_id, name, description, sort) values
   (c_nails, 'Manucure russe & construction en gel', 'Manucure russe avec préparation minutieuse du contour de l’ongle et construction en gel pour créer une architecture harmonieuse, résistante et élégante.', 3)
   returning id into s_russe;
  insert into service_variants (service_id, name, description, price_cents, duration_min, sort) values
   (s_russe, 'Extension', 'Allongement de l’ongle et construction en gel.', 7000, 150, 1),
   (s_russe, 'Remplissage', 'Entretien de votre construction en gel existante.', 6000, 120, 2);

  -- French : semi-permanente et construction en gel (extension, remplissage), +10 € et +10 minutes
  insert into service_options (name, description, price_cents, duration_min, sort) values
   ('French manucure', 'Finition French élégante, ajoutée à votre manucure.', 1000, 10, 1)
   returning id into o_french;
  insert into service_option_links (service_id, option_id) values (s_semi, o_french), (s_russe, o_french);

  -- Faux cils : maquillage événementiel 80 € sans, 90 € avec
  insert into service_options (name, description, price_cents, duration_min, sort) values
   ('Faux cils', 'Pose de faux cils pour un regard intensifié.', 1000, 0, 2)
   returning id into o_lashes;
  insert into service_option_links (service_id, option_id) values (s_event, o_lashes);

  insert into services (category_id, name, description, highlights, note, price_cents, duration_min, sort) values
   (c_facial, 'Soin du visage personnalisé — Bespoke Facial Treatment',
    'Offrez à votre peau un soin entièrement personnalisé, adapté à ses besoins et à ses caractéristiques. Chaque séance débute par une analyse de peau afin de sélectionner le protocole et les actifs les plus appropriés.',
    array[
      'Anti-âge : prévention et atténuation de l’apparence des signes de l’âge.',
      'Peaux sensibles : soin apaisant et respectueux des peaux réactives.',
      'Purifiant : soin adapté aux peaux présentant des imperfections, des pores obstrués ou un excès de sébum.',
      'Éclat : soin revitalisant pour les teints ternes et fatigués.',
      'Hydratation : soin destiné à améliorer le confort et l’hydratation cutanée.'
    ],
    'Vous n’avez rien à choisir à l’avance : le protocole est déterminé sur place, après une analyse professionnelle de votre peau.',
    7000, 60, 1);
end $$;

insert into gallery_items (image_url, alt, category, sort)
select * from (values
  ('/images/maquillage-glam.webp',   'Maquillage glamour, regard charbonneux et teint lumineux', 'Make-up', 1),
  ('/images/maquillage-smoky.webp',  'Maquillage smoky eyes et lèvres rosées', 'Make-up', 2),
  ('/images/sourcils.webp',          'Brow lift et sourcils restructurés', 'Lash & Brow', 3),
  ('/images/ongles-amande.webp',     'Construction en gel, forme amande, rose laiteux', 'Nails', 4),
  ('/images/editorial.webp',         'Maquillage éditorial, eyeliner graphique', 'Make-up', 5),
  ('/images/lash-lift.webp',         'Lash lift en cours de pose', 'Lash & Brow', 6),
  ('/images/ongles-carres.webp',     'Construction en gel, forme carrée, rose nude', 'Nails', 7)
) as v(image_url, alt, category, sort)
where not exists (select 1 from gallery_items);

-- Horaires : du lundi au samedi, 10h–20h, sans pause
insert into working_hours (weekday, start_time, end_time)
select d, '10:00', '20:00' from generate_series(1, 6) d
where not exists (select 1 from working_hours);
