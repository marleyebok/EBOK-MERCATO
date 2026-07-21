# 🏀 EBOK-MERCATO

Le mercato du basket amateur : une plateforme de mise en relation entre
**joueurs**, **coachs**, **agents** et **clubs**. Une sorte de « Indeed du
basket » pour trouver des projets sportifs adaptés à son profil.
Un outil de la galaxie EBOK Basketball.

## Architecture (migré de Firebase vers Neon)

Cet outil tournait sur Firebase (Auth + Firestore + Storage). Il a été **migré
vers la base Neon partagée de la galaxie**, pour tout centraliser au même endroit.

- **Front-end** : inchangé — pages statiques HTML/CSS/JS dans `public/`.
- **Données** : PostgreSQL (Neon), schéma `mercato` + identité dans `shared.users`.
- **API** : fonctions serverless dans `api/` (Vercel), appelées par
  `public/js/db.js`. Les signatures de `db.js` sont restées identiques :
  les pages n'ont pas eu à changer.
- **Auth** : e-mail / mot de passe, session par cookie signé (JWT) posé sur
  `.ebok.fr` → pose déjà les bases du compte unique de la galaxie.
- **Fichiers** (photos, CV) : Vercel Blob.

### Schéma de données

| Table | Rôle |
|---|---|
| `shared.users` | identité (uid, email, mot de passe haché, nom) |
| `mercato.accounts` | rôle Mercato : `membre` / `club` / `agent` |
| `mercato.profiles` | annonces (colonnes clés + `data` JSONB) |
| `mercato.conversations` / `mercato.messages` | messagerie |

Les tables se créent **automatiquement** au premier appel API.

## Configuration (Vercel → Settings → Environment Variables)

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | La **même** connection string Neon que le reste de la galaxie |
| `SESSION_SECRET` | Une longue chaîne aléatoire (signe les cookies de session) |

Pour l'upload des photos / CV : onglet **Storage → Create Database → Blob →
Connect** (injecte `BLOB_READ_WRITE_TOKEN` tout seul). Sans lui, l'upload est
désactivé mais le reste fonctionne.

## Développement local

```bash
npm install
npm start          # sert public/ sur http://localhost:3000 (statique seul)
```

Pour tester aussi les fonctions `api/` en local : `vercel dev` (nécessite le
CLI Vercel et un `.env.local` — voir `.env.example`).

## Points d'API

`/api/auth` (session, register, login, logout) · `/api/profiles` (annonces) ·
`/api/messages` (messagerie) · `/api/users` (infos publiques) · `/api/upload`
(fichiers). La messagerie utilise du **polling** (pas de temps réel Firestore).
