/**
 * EBOK-MERCATO — serveur.
 * Node + Express + stockage fichier JSON. Aucun build, aucune base à installer.
 *   npm install && npm start   →   http://localhost:3000
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const store = require('./lib/store');
const vocab = require('./lib/vocab');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Uploads (photos) ----
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, store.id() + ext);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 Mo
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpe?g|png|webp|gif)/.test(file.mimetype);
    cb(ok ? null : new Error('Format image non supporté'), ok);
  },
});

// Documents PDF (CV sportif / CV professionnel).
const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, store.id() + '.pdf'),
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('Merci de joindre un fichier PDF.'), ok);
  },
});

// ---- Middlewares ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ebok-mercato-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 },
  })
);

// ---- Helpers ----
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Non connecté' });
  next();
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, accountType: user.accountType };
}

// Ne renvoie jamais le userId brut vers l'extérieur pour les annonces publiques.
function publicProfile(p) {
  if (!p) return null;
  const { userId, ...rest } = p;
  return rest;
}

const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const niveauIndex = (n) => vocab.NIVEAUX.indexOf(n);

// ---------------------------------------------------------------------------
// API : vocabulaire
// ---------------------------------------------------------------------------
app.get('/api/vocab', (req, res) => {
  res.json({
    niveaux: vocab.NIVEAUX,
    autresParcours: vocab.AUTRES_PARCOURS,
    niveauxTous: vocab.NIVEAUX_TOUS,
    postes: vocab.POSTES,
    regions: vocab.REGIONS,
    avantages: vocab.AVANTAGES,
    caracteristiques: vocab.CARACTERISTIQUES,
  });
});

// ---------------------------------------------------------------------------
// API : authentification
// ---------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { email, password, accountType } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  if (String(password).length < 6)
    return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
  if (!['membre', 'club'].includes(accountType))
    return res.status(400).json({ error: 'Type de compte invalide.' });
  if (store.findUserByEmail(email))
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = store.createUser({ email: String(email).trim(), passwordHash, accountType });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = store.findUserByEmail(email || '');
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  const user = req.session.userId ? store.findUserById(req.session.userId) : null;
  if (!user) return res.json({ user: null, profile: null });
  const profile = store.getProfileByUserId(user.id);
  res.json({ user: publicUser(user), profile: profile || null });
});

// ---------------------------------------------------------------------------
// API : photo
// ---------------------------------------------------------------------------
app.post('/api/upload', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ---------------------------------------------------------------------------
// API : document PDF (CV)
// ---------------------------------------------------------------------------
app.post('/api/upload-doc', requireAuth, uploadDoc.single('doc'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ---------------------------------------------------------------------------
// API : profil / annonce
// ---------------------------------------------------------------------------
app.post('/api/profile', requireAuth, (req, res) => {
  const user = store.findUserById(req.session.userId);
  const body = req.body || {};

  // Le "kind" dépend du type de compte : un club ne peut créer qu'une annonce club.
  let kind = body.kind;
  if (user.accountType === 'club') kind = 'club';
  else if (!['joueur', 'coach'].includes(kind)) kind = 'joueur';

  const data = {
    kind,
    published: body.published !== false,
    // Commun
    title: (body.title || '').toString().slice(0, 140),
    displayName: (body.displayName || '').toString().slice(0, 120),
    photo: (body.photo || '').toString(),
    region: body.region || '',
    ville: (body.ville || '').toString().slice(0, 120),
    description: (body.description || '').toString(),
    avantages: asArray(body.avantages),
    // Joueur / Coach
    dateNaissance: body.dateNaissance || '',
    taille: body.taille ? Number(body.taille) : null,
    poids: body.poids ? Number(body.poids) : null,
    poste: body.poste || '',
    postesJoues: asArray(body.postesJoues),
    niveauActuel: body.niveauActuel || '',
    niveauSaisonPassee: body.niveauSaisonPassee || '',
    meilleurNiveau: body.meilleurNiveau || '',
    caracteristiques: asArray(body.caracteristiques),
    qualites: (body.qualites || '').toString(),
    cvSportif: (body.cvSportif || '').toString(),
    cvSportifFile: (body.cvSportifFile || '').toString(),
    cvProFile: (body.cvProFile || '').toString(),
    videoUrl: (body.videoUrl || '').toString().slice(0, 300),
    palmares: (body.palmares || '').toString(),
    statsSaisonPassee: (body.statsSaisonPassee || '').toString(),
    projetRecherche: (body.projetRecherche || '').toString(),
    projetPro: (body.projetPro || '').toString(),
    attentes: (body.attentes || '').toString(),
    axeProgression: (body.axeProgression || '').toString(),
    espaceLibre: (body.espaceLibre || '').toString(),
    // Club
    nomClub: (body.nomClub || '').toString().slice(0, 140),
    niveauPratique: body.niveauPratique || '',
    profilsRecherches: asArray(body.profilsRecherches),
    niveauRecherche: body.niveauRecherche || '',
    projetSportif: (body.projetSportif || '').toString(),
    projetHumain: (body.projetHumain || '').toString(),
  };

  const profile = store.upsertProfile(user.id, data);
  res.json({ profile: publicProfile(profile) });
});

// Liste des annonces avec filtres.
app.get('/api/annonces', (req, res) => {
  const q = req.query;
  const type = q.type || 'tout'; // joueurs | coachs | clubs | tout
  const kindMap = { joueurs: 'joueur', coachs: 'coach', clubs: 'club' };

  let items = store.listProfiles().filter((p) => p.published !== false);

  if (kindMap[type]) items = items.filter((p) => p.kind === kindMap[type]);

  // --- Recherche avancée côté "joueur cherche club" (filtre les annonces club) ---
  if (q.region) items = items.filter((p) => p.region === q.region);
  if (q.niveau && (type === 'clubs' || type === 'coachs' || type === 'tout')) {
    const min = niveauIndex(q.niveau);
    items = items.filter((p) => {
      if (p.kind !== 'club') return true;
      return niveauIndex(p.niveauPratique) >= min;
    });
  }
  if (q.posteRecherche) {
    items = items.filter((p) => {
      if (p.kind !== 'club') return true;
      return asArray(p.profilsRecherches).includes(q.posteRecherche);
    });
  }
  if (q.avantage) {
    items = items.filter((p) => {
      if (p.kind !== 'club') return true;
      return asArray(p.avantages).includes(q.avantage);
    });
  }

  // --- Recherche avancée côté "club cherche joueur" (filtre les annonces joueur) ---
  const isJoueurSearch = type === 'joueurs';
  if (q.poste) {
    items = items.filter((p) => {
      if (p.kind !== 'joueur') return true;
      return p.poste === q.poste || asArray(p.postesJoues).includes(q.poste);
    });
  }
  if (q.tailleMin) {
    const min = Number(q.tailleMin);
    items = items.filter((p) => (p.kind !== 'joueur' ? true : (p.taille || 0) >= min));
  }
  if (q.ageMin || q.ageMax) {
    const now = new Date();
    const ageOf = (d) => {
      if (!d) return null;
      const b = new Date(d);
      let a = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
      return a;
    };
    items = items.filter((p) => {
      if (p.kind !== 'joueur') return true;
      const a = ageOf(p.dateNaissance);
      if (a == null) return false;
      if (q.ageMin && a < Number(q.ageMin)) return false;
      if (q.ageMax && a > Number(q.ageMax)) return false;
      return true;
    });
  }
  if (q.niveauSaisonMin) {
    const min = niveauIndex(q.niveauSaisonMin);
    items = items.filter((p) =>
      p.kind !== 'joueur' ? true : niveauIndex(p.niveauSaisonPassee) >= min
    );
  }
  if (q.meilleurNiveauMin) {
    const min = niveauIndex(q.meilleurNiveauMin);
    items = items.filter((p) =>
      p.kind !== 'joueur' ? true : niveauIndex(p.meilleurNiveau) >= min
    );
  }
  if (q.caracteristique) {
    items = items.filter((p) =>
      p.kind !== 'joueur' ? true : asArray(p.caracteristiques).includes(q.caracteristique)
    );
  }

  // Recherche texte libre
  if (q.texte) {
    const t = q.texte.toLowerCase();
    items = items.filter((p) =>
      [p.title, p.displayName, p.nomClub, p.description, p.ville, p.qualites]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(t)
    );
  }

  void isJoueurSearch;
  res.json({ annonces: items.map(publicProfile) });
});

// Détail d'une annonce.
app.get('/api/annonces/:id', (req, res) => {
  const p = store.getProfileById(req.params.id);
  if (!p || p.published === false) return res.status(404).json({ error: 'Annonce introuvable.' });
  res.json({ annonce: publicProfile(p) });
});

// ---- Fichiers statiques + pages ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- Gestion d'erreurs (upload, etc.) : réponse JSON pour l'API ----
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const message =
    err && err.code === 'LIMIT_FILE_SIZE'
      ? 'Fichier trop volumineux.'
      : (err && err.message) || 'Une erreur est survenue.';
  res.status(400).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`EBOK-MERCATO en ligne → http://localhost:${PORT}`);
});
