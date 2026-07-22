# 🏀 EBOK-MERCATO

Le mercato du basket amateur : une plateforme de mise en relation entre
**joueurs**, **coachs**, **agents** et **clubs**. Une sorte de « Indeed du
basket » pour trouver des projets sportifs adaptés à son profil.
Un outil de la galaxie EBOK Basketball.

## Architecture (Neon + Clerk)

Cet outil tournait sur Firebase, puis sur une auth maison (Neon). L'identité est
désormais gérée par **Clerk** — le **compte unique de la galaxie EBOK** — tandis
que les données restent dans la **base Neon partagée**.

- **Front-end** : pages statiques HTML/CSS/JS dans `public/`. L'inscription et la
  connexion utilisent les composants **Clerk** (`public/js/clerk.js`).
- **Identité** : **Clerk** (e-mail, mot de passe, connexions sociales, MFA…).
  Une seule instance Clerk pour toute la galaxie → un login partagé sur
  `*.ebok.fr` (en production).
- **Données** : PostgreSQL (Neon), schéma `mercato`, indexé par l'**ID Clerk**.
  « Zéro miroir » : aucune copie locale des identités — l'e-mail et le nom réel
  sont lus à la volée depuis Clerk.
- **API** : fonctions serverless dans `api/` (Vercel). Elles valident le **token
  de session Clerk** (`Authorization: Bearer …`) via `@clerk/backend`.
- **Fichiers** (photos, CV) : Vercel Blob.

### Schéma de données

| Table | Rôle |
|---|---|
| _Clerk_ | identité (e-mail, mot de passe, nom) — **pas dans Neon** |
| `mercato.accounts` | rôle Mercato (`membre` / `club` / `agent`) + nom affiché, clé = ID Clerk |
| `mercato.profiles` | annonces (colonnes clés + `data` JSONB) |
| `mercato.conversations` / `mercato.messages` | messagerie |

Les tables se créent **automatiquement** au premier appel API.

### Parcours d'inscription

1. `/inscription.html` → composant **Clerk** (crée l'identité).
2. Redirection vers `/bienvenue.html` → choix du type de compte
   (joueur/coach · club · agent) + nom affiché → crée la ligne `mercato.accounts`.
3. `/bienvenue.html` sert aussi de **routeur post-connexion** (agent → `/agent.html`,
   sinon → `/mon-profil.html`).

## Configuration (Vercel → Settings → Environment Variables)

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | La **même** connection string Neon que le reste de la galaxie |
| `CLERK_SECRET_KEY` | La clé secrète de l'instance Clerk (`sk_test_…` ou `sk_live_…`) |

La clé « publishable » Clerk (publique) est dans `public/js/clerk.js`.

Pour l'upload des photos / CV : onglet **Storage → Create Database → Blob →
Connect** (injecte `BLOB_READ_WRITE_TOKEN` tout seul). Sans lui, l'upload est
désactivé mais le reste fonctionne.

### Passage en production (compte unique sur toute la galaxie)

L'instance **dev** Clerk fait tourner l'inscription sur Mercato, mais la session
n'est **pas** partagée entre les sous-domaines. Pour le vrai compte unique :
configurer une **instance Clerk de production** sur `ebok.fr` (enregistrements
DNS), puis remplacer `CLERK_SECRET_KEY` par `sk_live_…` et la clé publishable
dans `public/js/clerk.js` par `pk_live_…` (et `FRONTEND_API` par `clerk.ebok.fr`).

## Développement local

```bash
npm install
npm start          # sert public/ sur http://localhost:3000 (statique seul)
```

Pour tester aussi les fonctions `api/` en local : `vercel dev` (nécessite le
CLI Vercel et un `.env.local` — voir `.env.example`).

## Points d'API

`/api/auth` (session courante + onboarding du rôle) · `/api/profiles` (annonces) ·
`/api/messages` (messagerie) · `/api/users` (infos publiques) · `/api/upload`
(fichiers). L'inscription / la connexion sont gérées par **Clerk** côté client.
La messagerie utilise du **polling** (pas de temps réel).
