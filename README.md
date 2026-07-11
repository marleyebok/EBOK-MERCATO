# 🏀 EBOK-MERCATO

Le mercato du basket amateur : une plateforme de mise en relation entre **joueurs**, **coachs**, **agents** et **clubs**.
Une sorte de « Indeed du basket » pour que les joueurs de niveau amateur et intermédiaire trouvent des projets sportifs adaptés à leur profil.

Fait partie de la galaxie d'applications **EBOK**.

---

## Architecture

100 % **Firebase**, sans serveur applicatif à maintenir :

- **Firebase Authentication** — comptes et connexion (email / mot de passe).
- **Cloud Firestore** — utilisateurs, annonces, agents, messagerie.
- **Firebase Storage** — photos et CV en PDF.
- **Firebase Hosting** — hébergement du site (fichiers de `public/`).

Le front est en HTML/CSS/JS pur (modules ES, aucun build). Un mini serveur statique
(`server.js`, sans dépendance) sert juste au **développement local**.

---

## Fonctionnalités

- **Quatre types de comptes** : *Joueur / Coach*, *Club / Équipe*, *Agent*.
- **Annonces riches** :
  - Joueur / coach : slogan, photo, CV sportif, palmarès, stats, poste, taille/poids, qualités,
    axes de progression, projet recherché, projet pro/études, attentes, espace libre.
    Pièces jointes **CV sportif (PDF)**, **CV professionnel (PDF)** et **vidéo highlights YouTube** intégrée.
  - Club : lieu, niveau de pratique, profils recherchés, projet sportif, projet humain, avantages.
- **Page Annonces** : filtres *Tout / Joueurs / Coachs / Clubs*, tri du plus récent, recherche avancée
  (région, niveau, poste, avantages côté joueur ; âge, taille, poste, niveaux, caractéristiques côté club).
- **Messagerie** en temps réel entre les acteurs (bouton « Contacter » sur chaque annonce).
- **Profil Agent** : crée et gère plusieurs fiches de joueurs, les met à jour, et discute
  avec les clubs en leur nom (les messages envoyés à un joueur géré arrivent à son agent).

---

## Mise en route

### 1. Créer le projet Firebase

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet**.
2. **Authentication** → *Sign-in method* → active **Adresse e-mail / Mot de passe**.
3. **Firestore Database** → *Créer une base* (mode production).
4. **Storage** → *Commencer*.
5. **Paramètres du projet** → *Tes applications* → **Web (</>)** → récupère la config SDK.

### 2. Renseigner la config

Colle tes valeurs dans **`public/js/firebase-config.js`** (elles sont publiques par conception,
la sécurité vient des règles ci-dessous — tu peux committer ce fichier).

### 3. Déployer les règles de sécurité

Les règles fournies (`firestore.rules`, `storage.rules`) verrouillent l'accès :
annonces publiées lisibles par tous, le reste réservé au propriétaire / aux participants d'une conversation.

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # puis mets ton PROJECT_ID
firebase deploy --only firestore:rules,storage
```

### 4. Lancer en local

```bash
npm start          # → http://localhost:3000
```

(Un simple serveur statique. Tu peux aussi utiliser `firebase serve`.)

### 5. Mettre en ligne

```bash
firebase deploy --only hosting
```

> ℹ️ Au premier chargement d'une liste, Firestore peut te proposer de créer un index
> (lien en un clic dans la console) : accepte-le si demandé.

---

## Structure du projet

```
EBOK-MERCATO/
├── firebase.json          # config Hosting / Firestore / Storage
├── firestore.rules        # règles d'accès Firestore
├── storage.rules          # règles d'accès Storage
├── .firebaserc.example    # à copier en .firebaserc avec ton PROJECT_ID
├── server.js              # mini serveur statique (dev local, zéro dépendance)
└── public/
    ├── index.html · annonces.html · inscription.html · connexion.html
    ├── mon-profil.html · profil.html · agent.html · messages.html
    ├── css/style.css · img/logo.svg
    └── js/
        ├── firebase-config.js   # ⚙️ TA config Firebase
        ├── db.js                # couche de données Firebase (auth, profils, agents, messagerie, upload)
        ├── ui.js                # en-tête + gardes d'accès
        ├── vocab.js             # listes (niveaux, postes, régions, avantages, caractéristiques)
        ├── common.js            # helpers DOM
        └── pages/               # un module par page
```

---

## À affiner ensemble plus tard

Listes de départ, faciles à modifier dans **`public/js/vocab.js`** :

- `AVANTAGES` — avantages proposés / recherchés.
- `CARACTERISTIQUES` — caractéristiques dominantes d'un joueur.
