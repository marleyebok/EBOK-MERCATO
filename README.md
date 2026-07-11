# 🏀 EBOK-MERCATO

Le mercato du basket amateur : une plateforme de mise en relation entre **joueurs**, **coachs** et **clubs**.
Une sorte de « Indeed du basket » pour que les joueurs de niveau amateur et intermédiaire trouvent des projets sportifs adaptés à leur profil.

Fait partie de la galaxie d'applications **EBOK**.

---

## Démarrage

Aucune base de données à installer, aucun build. Il te faut juste [Node.js](https://nodejs.org) (version 18 ou plus).

```bash
npm install
npm start
```

Puis ouvre **http://localhost:3000**.

Pour changer le port : `PORT=8080 npm start`.

---

## Ce que fait le site

- **Deux types de comptes** : *Joueur / Coach* et *Club / Équipe*.
- **Création d'une annonce** riche :
  - Joueur / coach : slogan, photo, CV sportif, palmarès, stats saison dernière, poste, taille/poids,
    qualités, axes de progression, projet recherché, projet pro/études, attentes, espace libre, etc.
    Possibilité de joindre un **CV sportif (PDF)**, un **CV professionnel (PDF)** et un
    **lien vidéo YouTube** (« highlights ») visionnable directement sur la fiche.
  - Club : lieu, niveau de pratique, profils recherchés, projet sportif, projet humain, avantages.
- **Page Annonces** avec les filtres **Tout / Joueurs / Coachs / Clubs**, triée du plus récent au plus ancien.
- **Recherche avancée** qui s'adapte au filtre :
  - Côté joueur (cherche un club) : région, niveau, poste recherché, avantages.
  - Côté club (cherche un joueur) : âge, taille, poste, niveau saison passée, meilleur niveau, caractéristique dominante.
- **Page publique** détaillée pour chaque annonce.

---

## À affiner ensemble plus tard

Comme convenu, deux listes sont posées comme point de départ et sont faciles à modifier —
tout est centralisé dans **`lib/vocab.js`** :

- `AVANTAGES` — les avantages proposés / recherchés.
- `CARACTERISTIQUES` — les caractéristiques dominantes d'un joueur.

Les autres listes (niveaux, postes, régions) s'y trouvent aussi.

---

## Structure du projet

```
EBOK-MERCATO/
├── server.js            # Serveur Express + API
├── lib/
│   ├── store.js         # Stockage fichier JSON (data/db.json)
│   └── vocab.js         # Listes de valeurs (niveaux, postes, régions, avantages, caractéristiques)
├── public/              # Frontend (HTML / CSS / JS, sans build)
│   ├── index.html       # Accueil
│   ├── inscription.html # Création de compte
│   ├── connexion.html   # Connexion
│   ├── annonces.html    # Liste + filtres + recherche avancée
│   ├── mon-profil.html  # Édition de son annonce
│   ├── profil.html      # Page publique d'une annonce
│   ├── css/style.css
│   ├── js/
│   └── img/logo.svg
└── data/db.json         # Données (créé automatiquement, ignoré par git)
```

## Notes techniques

- Stockage : simple fichier `data/db.json` (parfait pour un MVP, migrable vers une vraie base plus tard).
- Mots de passe hachés avec `bcryptjs`. Sessions via cookie signé.
- Photos envoyées dans `public/uploads/`.
- Pensé pour rester **le plus simple possible** et facile à faire évoluer.
