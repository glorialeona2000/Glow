# Sauvegardes et restauration

## Ce qui est sauvegardé

Chaque nuit (vers 3 h, heure belge), GitHub Actions exporte toute la base (réservations, clientes, prestations, textes, photos téléversées), la **chiffre** (AES-256, avec la phrase `BACKUP_PASSPHRASE`) et la conserve **30 jours**.
Les sauvegardes sont visibles dans GitHub → onglet **Actions** → *Sauvegarde de la base* → une exécution → section *Artifacts*.

> Sans la phrase de passe `BACKUP_PASSPHRASE`, une sauvegarde est illisible. Conservez-la dans votre gestionnaire de mots de passe.

## Vérifier que les sauvegardes fonctionnent

Une fois par mois : onglet **Actions** → *Sauvegarde de la base* → la dernière exécution doit avoir une coche verte et un fichier `sauvegarde-…`.

## Restaurer (avec l'aide d'une personne technique si besoin)

Prérequis : un ordinateur avec `gpg` et le client PostgreSQL 17 (`pg_restore`).

1. Téléchargez l'artefact depuis GitHub (fichier `.zip`), décompressez-le : vous obtenez `belavica-AAAA-MM-JJ.dump.gpg`.
2. Déchiffrez :
   ```bash
   gpg --decrypt -o belavica.dump belavica-AAAA-MM-JJ.dump.gpg
   ```
3. **Option recommandée — restaurer dans un nouveau projet Supabase** (aucun risque pour la base actuelle) :
   - créez un projet Supabase, exécutez seulement `create extension if not exists btree_gist;` dans le SQL Editor ;
   - restaurez :
     ```bash
     pg_restore --no-owner --no-privileges -d "ADRESSE_SESSION_POOLER_DU_NOUVEAU_PROJET" belavica.dump
     ```
     (un avertissement « schema public already exists » est normal) ;
   - recréez votre utilisateur admin (Authentication → Users) ;
   - dans Netlify, remplacez `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` par ceux du nouveau projet, puis *Trigger deploy* ;
   - mettez à jour le secret GitHub `BACKUP_DATABASE_URL`.
4. **Option — écraser la base actuelle** (après avoir fait une sauvegarde manuelle via *Run workflow*) :
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges -d "ADRESSE_SESSION_POOLER" belavica.dump
   ```

Procédure testée lors du développement (export → chiffrement → déchiffrement → restauration : données identiques).

## Supprimer les données d'une cliente (droit à l'effacement)

Admin → **Clientes** → la fiche → **Supprimer les données** (taper `SUPPRIMER`). Les rendez-vous à venir sont annulés, l'historique est anonymisé.
Les sauvegardes contenant encore ces données disparaissent automatiquement au bout de 30 jours.

Les fiches sans rendez-vous depuis la durée de conservation (36 mois par défaut, réglable dans *Paramètres*) sont supprimées automatiquement.
