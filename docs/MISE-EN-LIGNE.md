# Mise en ligne de belavica.com — guide pas à pas

Ce guide est écrit pour être suivi sans connaissances techniques. Comptez **1 h 30 à 2 h** la première fois.
Rien n'est payant : toutes les offres utilisées sont gratuites au lancement.

| Service | Rôle | Offre |
|---|---|---|
| **GitHub** | Stocke le code du site | Gratuit |
| **Supabase** | Base de données (réservations, clientes) + connexion admin | Gratuit |
| **Netlify** | Héberge le site, HTTPS automatique | Gratuit (usage commercial autorisé) |
| **Resend** | Envoie les e-mails de réservation | Gratuit (100 e-mails/jour) |
| **Cloudflare Turnstile** | Anti-robot sur le formulaire | Gratuit |
| **OVH** | Votre nom de domaine (déjà acheté) | — |

> 🔐 **Règle d'or** : les « clés » et mots de passe ne s'écrivent **jamais** dans le code ni dans un message. Ils se collent uniquement dans les écrans de configuration de Netlify / GitHub indiqués ci-dessous. Gardez-les dans un gestionnaire de mots de passe.

---

## Étape 1 — Supabase (base de données)

1. Créez un compte sur <https://supabase.com> (bouton *Start your project*, connexion avec GitHub possible).
2. **New project** :
   - Name : `belavica`
   - Database password : cliquez sur *Generate a password*, **copiez-le** dans votre gestionnaire de mots de passe.
   - Region : **Central EU (Frankfurt)** ← important pour le RGPD.
   - Plan : *Free*.
3. Une fois le projet prêt, menu de gauche **SQL Editor** → *New query* :
   - ouvrez le fichier `supabase/migrations/0001_init.sql` de ce dépôt, copiez tout son contenu, collez-le, cliquez **Run** ;
   - recommencez avec `supabase/migrations/0002_seed.sql` (le catalogue de vos prestations).
   - Le message *Success. No rows returned* est normal.
4. **Créer votre accès administrateur** : menu **Authentication** → **Users** → *Add user* → *Create new user* :
   - Email : `leona@belavica.com`
   - Password : un mot de passe long (12 caractères minimum), différent de tous vos autres mots de passe.
   - Cochez **Auto Confirm User**.
5. **Fermer les inscriptions publiques** : **Authentication** → **Sign In / Providers** (ou *Settings*) → désactivez **Allow new users to sign up**. Personne d'autre ne pourra créer de compte.
6. **Adresses autorisées** : **Authentication** → **URL Configuration** :
   - Site URL : `https://belavica.com`
   - Redirect URLs : ajoutez `https://belavica.com/admin/auth/callback`
7. **Récupérer les informations de connexion** (à garder sous la main pour l'étape 3) :
   - Bouton **Connect** en haut de la page → onglet *ORMs* ou *Connection string* → **Transaction pooler** (port **6543**). Copiez l'adresse et remplacez `[YOUR-PASSWORD]` par le mot de passe de l'étape 2 → c'est `DATABASE_URL`.
   - Même écran, **Session pooler** (port **5432**) → c'est `BACKUP_DATABASE_URL` (pour les sauvegardes, étape 6).
   - **Project Settings** → **API** : *Project URL* → `NEXT_PUBLIC_SUPABASE_URL` ; clé **anon / publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - ⚠️ N'utilisez **jamais** la clé `service_role` / `secret` : le site n'en a pas besoin.

## Étape 2 — Resend (e-mails)

1. Créez un compte sur <https://resend.com>.
2. **Domains** → *Add Domain* → `belavica.com`, région **Ireland (eu-west-1)**.
3. Resend affiche 2 à 4 enregistrements DNS (DKIM `resend._domainkey`, et pour le sous-domaine `send` : MX/TXT ou CNAME). **Laissez cette page ouverte** : vous les ajouterez chez OVH à l'étape 5.
   - Ces enregistrements concernent uniquement `resend._domainkey` et `send.belavica.com` : **ils ne touchent pas à vos e-mails existants** (`leona@belavica.com`).
4. **API Keys** → *Create API Key* → nom `belavica-site`, permission **Sending access**, domaine `belavica.com` → copiez la clé (`re_…`) → c'est `RESEND_API_KEY`.

## Étape 3 — Netlify (hébergement)

1. Créez un compte sur <https://www.netlify.com> avec **Sign up with GitHub**.
2. **Add new project** → *Import an existing project* → **GitHub** → autorisez l'accès au dépôt `glow` → sélectionnez-le.
3. Branche à déployer : la branche principale du dépôt (celle où le code est fusionné). Laissez les réglages de build proposés (ils viennent de `netlify.toml`).
4. Avant de lancer, cliquez **Add environment variables** (ou après : *Site configuration* → *Environment variables*) et ajoutez :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | adresse *Transaction pooler* de Supabase (étape 1.7) |
| `NEXT_PUBLIC_SUPABASE_URL` | *Project URL* Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé *anon / publishable* |
| `SITE_URL` | `https://belavica.com` |
| `ADMIN_EMAILS` | `leona@belavica.com` |
| `APP_SECRET` | texte aléatoire de 40+ caractères (voir ci-dessous) |
| `CRON_SECRET` | autre texte aléatoire de 40+ caractères |
| `IP_HASH_SALT` | autre texte aléatoire |
| `RESEND_API_KEY` | clé Resend `re_…` |
| `EMAIL_FROM` | `BELAVICA <reservations@belavica.com>` |

   Pour générer un texte aléatoire : <https://1password.com/password-generator> (40 caractères, lettres + chiffres) — un différent pour chaque variable.
5. **Deploy**. Après 2–3 minutes, le site est visible sur une adresse du type `https://xxx.netlify.app`. Notez ce nom (`xxx`).
6. Testez sur cette adresse : page d'accueil, puis `/admin` → connexion avec `leona@belavica.com`.

## Étape 4 — Brancher belavica.com sur Netlify

Dans Netlify : **Domain management** → *Add a domain* → `belavica.com` → *Verify* → *Add domain*.
Netlify ajoute aussi `www.belavica.com`. Choisissez **belavica.com comme domaine principal** (*Options → Set as primary domain*) : `www.belavica.com` redirigera automatiquement vers `belavica.com`.

Netlify propose d'utiliser « Netlify DNS » : **refusez** et choisissez la configuration **externe** (vous gardez vos DNS chez OVH, donc vos e-mails ne bougent pas).

## Étape 5 — DNS chez OVH (sans toucher à vos e-mails)

1. Connectez-vous à <https://www.ovh.com/manager> → **Web Cloud** → **Noms de domaine** → `belavica.com` → onglet **Zone DNS**.
2. **Avant toute modification** : bouton *Actions* / … → **Exporter la zone** (ou faites une capture d'écran de toute la liste). C'est votre sauvegarde.
3. **Ne touchez à aucune ligne de type `MX`, `SPF`, ni aux `TXT`/`CNAME` existants liés à votre messagerie** (`autoconfig`, `autodiscover`, `_dmarc`, `mail`, etc.).
4. Modifiez uniquement :

| Sous-domaine | Type | Action | Cible |
|---|---|---|---|
| *(vide)* `belavica.com` | **A** | modifier l'enregistrement A existant (ou l'ajouter) | `75.2.60.5` (adresse indiquée par Netlify — vérifiez-la dans l'écran Netlify) |
| *(vide)* `belavica.com` | **AAAA** | **supprimer** s'il existe (adresse IPv6 de la page OVH par défaut) | — |
| `www` | **CNAME** | modifier (ou supprimer l'ancien A/CNAME `www` puis ajouter) | `xxx.netlify.app.` (votre adresse Netlify, avec le point final) |

5. Ajoutez ensuite les enregistrements **Resend** exactement comme affichés par Resend (étape 2.3) :
   - Sous-domaine `resend._domainkey`, type **TXT**, valeur copiée en entier.
   - Sous-domaine `send`, type **MX** (priorité 10) et **TXT** `v=spf1 include:amazonses.com ~all` — ou les **CNAME** si Resend vous les propose à la place.
   - Chez OVH, saisissez seulement `send` ou `resend._domainkey` dans « Sous-domaine » (pas `send.belavica.com`).
6. Patientez (de 15 minutes à quelques heures). Puis :
   - Netlify → *Domain management* → *HTTPS* → **Verify DNS configuration** puis **Provision certificate**. Le certificat HTTPS (Let's Encrypt) est gratuit et renouvelé automatiquement.
   - Resend → *Domains* → **Verify**.
7. Vérifiez que vos e-mails professionnels fonctionnent toujours : envoyez-vous un e-mail vers `leona@belavica.com`.

## Étape 6 — Tâches automatiques et sauvegardes (GitHub)

Dans GitHub : dépôt `glow` → **Settings** → **Secrets and variables** → **Actions** → *New repository secret* :

| Secret | Valeur |
|---|---|
| `SITE_URL` | `https://belavica.com` |
| `CRON_SECRET` | **la même valeur** que dans Netlify |
| `BACKUP_DATABASE_URL` | adresse *Session pooler* de Supabase (port 5432) |
| `BACKUP_PASSPHRASE` | une phrase de passe longue, **notée dans votre gestionnaire de mots de passe** (sans elle, les sauvegardes sont illisibles) |

Puis onglet **Actions** → *Tâches planifiées* → **Run workflow** pour tester (coche verte = OK). Faites de même avec *Sauvegarde de la base*.

- *Tâches planifiées* tourne toutes les heures : rappels e-mail (si activés), suppression automatique des données anciennes (RGPD), et maintien de la base active (Supabase met en pause les projets gratuits inactifs 7 jours).
- *Sauvegarde de la base* tourne chaque nuit et conserve 30 jours de sauvegardes chiffrées. Restauration : `docs/SAUVEGARDES.md`.

## Étape 7 — Anti-robot Cloudflare Turnstile (recommandé)

1. Compte gratuit sur <https://dash.cloudflare.com> → **Turnstile** → *Add widget*.
2. Nom `belavica`, domaine `belavica.com`, mode **Managed**.
3. Copiez la *Site Key* → variable Netlify `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, et la *Secret Key* → `TURNSTILE_SECRET_KEY`.
4. Netlify → *Deploys* → **Trigger deploy** → *Deploy site* (nécessaire après un changement de variable).

Sans Turnstile, le site reste protégé (champ piège, délai minimum, limite de demandes par heure), mais Turnstile bloque les robots plus sophistiqués.

## Étape 8 — Réglages dans votre espace admin

Sur `https://belavica.com/admin` :

1. **Disponibilités** : vos horaires de travail (ex. mardi–samedi 9h30–18h30), vos pauses, puis les règles (temps tampon, délai minimum, réservation jusqu'à X jours).
2. **Prestations** : pour chaque prestation, le **prix** et la **durée**. Pour la manucure russe : prix et durée des formules *Renforcement* et *Extension*. Dans *Options* : le supplément et la durée de la **French**.
   Une prestation sans prix ou sans durée reste visible mais n'est pas réservable.
3. **Site** : relisez les textes (présentation, à propos, acompte, annulation). Ajoutez votre **numéro d'entreprise (BCE)** dès que vous l'avez (obligatoire en Belgique pour une activité enregistrée).
4. **Paramètres** : cliquez **Envoyer un e-mail de test** → vérifiez la réception sur `leona@belavica.com`.

## Étape 9 — Recette (tests avant d'annoncer le site)

Sur votre téléphone, en navigation normale :

- [ ] Réserver une prestation avec une adresse e-mail personnelle → vous recevez « Demande reçue », et `leona@belavica.com` reçoit « Nouvelle demande ».
- [ ] Le créneau réservé n'est plus proposé.
- [ ] Admin → **Accepter** → la cliente reçoit « Rendez-vous confirmé » avec le lien « Gérer mon rendez-vous ».
- [ ] Admin → **Modifier** l'heure → e-mail « Rendez-vous modifié ».
- [ ] Depuis l'e-mail, **Annuler** → e-mail d'annulation + notification pour vous.
- [ ] Refuser une demande → e-mail de refus.
- [ ] Bloquer un créneau / ajouter des congés → plus aucun créneau proposé sur la période.
- [ ] Tester sur iPhone **et** Android, depuis le lien de la bio Instagram.
- [ ] `https://www.belavica.com` redirige vers `https://belavica.com` avec le cadenas HTTPS.

## Étape 10 — Instagram

Profil → **Modifier le profil** → **Liens** → *Ajouter un lien externe* :

- URL : `https://belavica.com/reservation`
- Titre : `Réserver un rendez-vous`

Astuce : dans vos stories, utilisez l'autocollant **Lien** avec la même adresse. Pour proposer directement une prestation, copiez le lien du bouton « Réserver » de la page Prestations (ex. `https://belavica.com/reservation?prestation=…`).

---

## Coûts et limites à surveiller

- **Netlify gratuit** : 300 crédits/mois (chaque mise en ligne du code ≈ 15 crédits, le trafic consomme peu pour un studio). Si le quota était atteint, le site serait suspendu jusqu'au mois suivant : Netlify prévient par e-mail. Solution : offre *Personal* (~9 $/mois).
- **Supabase gratuit** : 500 Mo de base (des dizaines de milliers de réservations). Pas de sauvegarde automatique Supabase → nos sauvegardes nocturnes GitHub la remplacent. L'offre *Pro* (25 $/mois) ajoute des sauvegardes gérées et la restauration à un instant précis.
- **Resend gratuit** : 100 e-mails/jour, 3 000/mois (≈ 4 e-mails par réservation).
- **GitHub Actions** : 2 000 minutes/mois gratuites pour un dépôt privé ; les tâches du site en utilisent environ 800.

## En cas de problème

- **Le site affiche une erreur** : Netlify → *Logs* → *Functions* ; vérifiez les variables d'environnement.
- **Les e-mails n'arrivent pas** : Admin → *Paramètres* → *Journal des e-mails* (le motif d'échec y est indiqué), puis Resend → *Domains* (domaine vérifié ?).
- **Mot de passe admin oublié** : page de connexion → « Mot de passe oublié ? ». En dernier recours : Supabase → *Authentication* → *Users* → votre compte → *Send password recovery*.
