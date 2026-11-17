# BELAVICA — Beauty Studio, Arlon

Site officiel et plateforme de réservation en ligne de **belavica.com** : site vitrine, réservation sans compte,
espace administrateur (agenda, prestations, clientes, contenus) et e-mails automatiques.

- 📘 **Mettre le site en ligne** : [`docs/MISE-EN-LIGNE.md`](docs/MISE-EN-LIGNE.md)
- 🗂️ **Utiliser l’espace admin** : [`docs/GUIDE-ADMIN.md`](docs/GUIDE-ADMIN.md)
- 💾 **Sauvegardes / restauration / RGPD** : [`docs/SAUVEGARDES.md`](docs/SAUVEGARDES.md)

## Pages

| Adresse | Contenu |
|---|---|
| `/` | Accueil : présentation, 4 univers, galerie, à propos, infos pratiques |
| `/prestations` | Carte des prestations et tarifs |
| `/reservation` | Réservation en ligne (accepte `?prestation=<id>` ou `?categorie=<slug>`) |
| `/contact` | Instagram, ville, horaires |
| `/rdv/<lien>` | Lien personnel de la cliente pour consulter / annuler |
| `/admin` | Espace administrateur (connexion Supabase Auth) |
| `/confidentialite`, `/mentions-legales` | Pages légales (RGPD) |

## Technique

- **Next.js 16** (App Router, Server Actions), **TypeScript**, **Tailwind CSS 4**
- **Supabase** : PostgreSQL (EU) + Auth pour l’admin. Le site interroge la base **uniquement côté serveur**
  (`DATABASE_URL`) ; toutes les tables ont RLS activé sans politique publique : la clé publique ne donne accès à aucune donnée.
- **Anti-double réservation** : revérification serveur + contrainte d’exclusion PostgreSQL (`bookings_no_overlap`)
  sur `[début, fin + temps tampon)` des rendez-vous en attente ou confirmés.
- **E-mails** : Resend (API HTTP), chaque envoi journalisé dans `email_log` (envoyé / échec / non envoyé).
- **Fuseau horaire** : Europe/Brussels (gestion des changements d’heure testée).
- **Tâches planifiées** (GitHub Actions) : rappels, purge RGPD, maintien de la base active ; sauvegarde chiffrée quotidienne.
- **Hébergement** : Netlify (offre gratuite, usage commercial autorisé).

```
src/
  app/(site)/          pages publiques (+ reservation/BookingWizard.tsx)
  app/admin/           espace admin (actions.ts = toutes les actions protégées)
  app/api/             disponibilités, tâches planifiées
  lib/availability.ts  moteur de créneaux (pur, testé)
  lib/bookings.ts      création / annulation / notifications
  lib/content.ts       textes modifiables depuis l’admin
supabase/migrations/   schéma SQL + catalogue initial (sans prix inventés)
tests/                 tests unitaires (vitest) et de bout en bout (Playwright)
```

## Développement

```bash
cp .env.example .env.local   # puis compléter
npm install
npm run dev                  # http://localhost:3000
```

## Tests

```bash
npm run lint && npm run typecheck
npm test                     # moteur de disponibilités, fuseau horaire
npm run test:e2e             # nécessite PostgreSQL local (postgres/postgres)
```

Les tests de bout en bout recréent une base locale, démarrent un faux serveur d’authentification et d’e-mails
(`tests/e2e/mock-supabase-auth.mjs`) et jouent les parcours sur mobile : réservation complète, conflit de deux
clientes sur le même créneau, formation sur demande, anti-robot, protection de l’admin, acceptation, modification,
annulation (dans les délais et tardive), prix / visibilité / congés, e-mails envoyés et en échec.

## Évolutions prévues par l’architecture

Paiement d’acompte en ligne (champ `deposit_status` déjà en place), cartes cadeaux, codes promo, forfaits,
synchronisation Google Calendar, rappels SMS (même mécanisme que les rappels e-mail), version anglaise
(textes centralisés dans `lib/content.ts`), boutique, plusieurs praticiennes (ajout d’une colonne `staff_id`
sur les réservations et les horaires).
