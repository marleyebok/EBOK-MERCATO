import { renderHeader, requireAuth } from '../ui.js';
import {
  getMyProfile, saveMyProfile, getManagedProfile, saveManagedProfile, uploadFile,
} from '../db.js';
import { NIVEAUX, AUTRES_PARCOURS, POSTES, REGIONS, AVANTAGES, CARACTERISTIQUES } from '../vocab.js';

await renderHeader('profil');
const { user } = await requireAuth();
if (!user) throw new Error('non authentifié');

const params = new URLSearchParams(location.search);
const managedMode = params.get('managed') === '1' && user.accountType === 'agent';
let managedId = params.get('id') || null;

// Un agent qui n'édite pas un joueur précis n'a pas de profil perso → redirigé.
if (user.accountType === 'agent' && !managedMode) { location.href = '/agent.html'; throw new Error('redirect'); }

const isClub = user.accountType === 'club' && !managedMode;

// Charge le profil existant
let profile = null;
if (managedMode) {
  profile = managedId ? await getManagedProfile(managedId) : null;
  document.querySelector('h1.page').textContent = managedId ? 'Modifier le joueur' : 'Nouveau joueur';
} else {
  profile = await getMyProfile();
}

// Affichage des blocs
document.getElementById('blocMembre').style.display = isClub ? 'none' : '';
document.getElementById('blocClub').style.display = isClub ? '' : 'none';
document.getElementById('kindRow').style.display = isClub ? 'none' : '';

// Sélecteur joueur / coach
let kind = isClub ? 'club' : (profile && profile.kind) || 'joueur';
const kindSeg = document.getElementById('kindSeg');
function refreshKind() {
  kindSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
}
kindSeg.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  kind = b.dataset.kind; refreshKind();
});
refreshKind();

// Listes
fillSelect(document.getElementById('region'), REGIONS, { selected: profile?.region });
fillSelect(document.getElementById('poste'), POSTES, { placeholder: '—', selected: profile?.poste });
const niveauFields = {};
['niveauActuel', 'niveauSaisonPassee', 'meilleurNiveau', 'niveauPratique', 'niveauRecherche'].forEach((k) => {
  niveauFields[k] = setupNiveauField(document.getElementById(k), {
    niveaux: NIVEAUX, autres: AUTRES_PARCOURS, selected: profile?.[k],
  });
});
buildChecks(document.getElementById('postesJoues'), POSTES, 'postesJoues', profile?.postesJoues);
buildChecks(document.getElementById('caracteristiques'), CARACTERISTIQUES, 'caracteristiques', profile?.caracteristiques);
buildChecks(document.getElementById('avantagesMembre'), AVANTAGES, 'avantagesMembre', profile?.avantages);
buildChecks(document.getElementById('avantagesClub'), AVANTAGES, 'avantagesClub', profile?.avantages);
buildChecks(document.getElementById('profilsRecherches'), POSTES, 'profilsRecherches', profile?.profilsRecherches);

// Préremplissage
const setVal = (id, v) => { const n = document.getElementById(id); if (n) n.value = v == null ? '' : v; };
function viewLinkTo(id) {
  const vl = document.getElementById('viewLink');
  vl.style.display = ''; vl.href = '/profil.html?id=' + id;
}
if (profile) {
  ['title', 'displayName', 'ville', 'dateNaissance', 'taille', 'poids', 'qualites',
   'axeProgression', 'cvSportif', 'palmares', 'statsSaisonPassee', 'projetRecherche',
   'projetPro', 'attentes', 'espaceLibre', 'nomClub', 'projetSportif', 'projetHumain', 'videoUrl']
    .forEach((k) => setVal(k, profile[k]));
  setVal('description', isClub ? '' : profile.description);
  setVal('descriptionClub', isClub ? profile.description : '');
  document.getElementById('photo').value = profile.photo || '';
  document.getElementById('published').checked = profile.published !== false;
  if (profile.photo) document.getElementById('photoStatus').innerHTML =
    `<a href="${escapeHtml(profile.photo)}" target="_blank">Photo actuelle</a>`;
  const setDoc = (hiddenId, statusId, url, label) => {
    if (!url) return;
    document.getElementById(hiddenId).value = url;
    document.getElementById(statusId).innerHTML = `<a href="${escapeHtml(url)}" target="_blank">${label} actuel</a>`;
  };
  setDoc('cvSportifFile', 'cvSportifStatus', profile.cvSportifFile, 'CV sportif');
  setDoc('cvProFile', 'cvProStatus', profile.cvProFile, 'CV professionnel');
  if (profile.id) viewLinkTo(profile.id);
}

// Upload photo (Firebase Storage)
document.getElementById('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const status = document.getElementById('photoStatus');
  status.textContent = 'Envoi en cours…';
  try {
    const url = await uploadFile(file, 'photos');
    document.getElementById('photo').value = url;
    status.innerHTML = `<a href="${escapeHtml(url)}" target="_blank">Photo envoyée ✓</a>`;
  } catch (err) { status.textContent = err.message || "Échec de l'envoi"; }
});

// Upload PDF
function setupDocUpload(inputId, hiddenId, statusId, label) {
  const input = document.getElementById(inputId);
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.type !== 'application/pdf') { document.getElementById(statusId).textContent = 'Merci de joindre un PDF.'; return; }
    const status = document.getElementById(statusId);
    status.textContent = 'Envoi en cours…';
    try {
      const url = await uploadFile(file, 'cv');
      document.getElementById(hiddenId).value = url;
      status.innerHTML = `<a href="${escapeHtml(url)}" target="_blank">${label} envoyé ✓</a>`;
    } catch (err) { status.textContent = err.message || "Échec de l'envoi"; }
  });
}
setupDocUpload('cvSportifFileInput', 'cvSportifFile', 'cvSportifStatus', 'CV sportif');
setupDocUpload('cvProFileInput', 'cvProFile', 'cvProStatus', 'CV professionnel');

// Enregistrement
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  msg.innerHTML = '';
  const g = (id) => (document.getElementById(id) ? document.getElementById(id).value : '');

  const payload = {
    kind,
    published: document.getElementById('published').checked,
    title: g('title'),
    displayName: g('displayName'),
    photo: g('photo'),
    region: g('region'),
    ville: g('ville'),
  };

  if (isClub) {
    Object.assign(payload, {
      nomClub: g('nomClub'),
      niveauPratique: niveauFields.niveauPratique.getValue(),
      niveauRecherche: niveauFields.niveauRecherche.getValue(),
      profilsRecherches: getChecked(document.getElementById('profilsRecherches'), 'profilsRecherches'),
      projetSportif: g('projetSportif'),
      projetHumain: g('projetHumain'),
      description: g('descriptionClub'),
      avantages: getChecked(document.getElementById('avantagesClub'), 'avantagesClub'),
    });
    if (!payload.displayName) payload.displayName = payload.nomClub;
  } else {
    Object.assign(payload, {
      dateNaissance: g('dateNaissance'),
      taille: g('taille') ? Number(g('taille')) : null,
      poids: g('poids') ? Number(g('poids')) : null,
      poste: g('poste'),
      postesJoues: getChecked(document.getElementById('postesJoues'), 'postesJoues'),
      niveauActuel: niveauFields.niveauActuel.getValue(),
      niveauSaisonPassee: niveauFields.niveauSaisonPassee.getValue(),
      meilleurNiveau: niveauFields.meilleurNiveau.getValue(),
      caracteristiques: getChecked(document.getElementById('caracteristiques'), 'caracteristiques'),
      description: g('description'),
      qualites: g('qualites'),
      axeProgression: g('axeProgression'),
      cvSportif: g('cvSportif'),
      cvSportifFile: g('cvSportifFile'),
      cvProFile: g('cvProFile'),
      videoUrl: g('videoUrl'),
      palmares: g('palmares'),
      statsSaisonPassee: g('statsSaisonPassee'),
      projetRecherche: g('projetRecherche'),
      projetPro: g('projetPro'),
      attentes: g('attentes'),
      espaceLibre: g('espaceLibre'),
      avantages: getChecked(document.getElementById('avantagesMembre'), 'avantagesMembre'),
    });
  }

  try {
    let saved;
    if (managedMode) {
      saved = await saveManagedProfile(managedId, payload);
      managedId = saved.id; // pour les enregistrements suivants
    } else {
      saved = await saveMyProfile(payload);
    }
    msg.innerHTML = '<div class="msg ok">Annonce enregistrée ✓</div>';
    viewLinkTo(saved.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${escapeHtml(err.message || 'Erreur')}</div>`;
  }
});
