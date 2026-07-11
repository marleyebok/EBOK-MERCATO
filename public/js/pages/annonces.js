import { renderHeader } from '../ui.js';
import { listAnnonces } from '../db.js';
import { NIVEAUX, AUTRES_PARCOURS, POSTES, REGIONS, AVANTAGES, CARACTERISTIQUES, niveauIndex } from '../vocab.js';

const { configured } = await renderHeader('annonces');

let currentType = 'tout';
let cache = null; // toutes les annonces publiées, chargées une fois

// Remplissage des selects de recherche
fillSelect(document.getElementById('f_region'), REGIONS);
fillSelect(document.getElementById('f_niveau'), NIVEAUX);
fillSelect(document.getElementById('f_posteRecherche'), POSTES);
fillSelect(document.getElementById('f_avantage'), AVANTAGES);
fillSelect(document.getElementById('f_poste'), POSTES);
fillSelect(document.getElementById('f_niveauSaisonMin'), NIVEAUX);
fillSelect(document.getElementById('f_meilleurNiveauMin'), NIVEAUX);
fillSelect(document.getElementById('f_caracteristique'), CARACTERISTIQUES);

const advClub = document.getElementById('advClub');
const advJoueur = document.getElementById('advJoueur');
function updateAdvVisibility() {
  const joueurMode = currentType === 'joueurs';
  advJoueur.style.display = joueurMode ? '' : 'none';
  advClub.style.display = joueurMode ? 'none' : '';
}

const seg = document.getElementById('filterSeg');
seg.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  currentType = b.dataset.type;
  seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
  updateAdvVisibility();
  render();
});

const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

function filtered() {
  const kindMap = { joueurs: 'joueur', coachs: 'coach', clubs: 'club' };
  const val = (id) => (document.getElementById(id).value || '').trim();
  let items = (cache || []).slice();

  if (kindMap[currentType]) items = items.filter((p) => p.kind === kindMap[currentType]);

  const region = val('f_region');
  if (region) items = items.filter((p) => p.region === region);

  const texte = val('f_texte').toLowerCase();
  if (texte) {
    items = items.filter((p) =>
      [p.title, p.displayName, p.nomClub, p.description, p.ville, p.qualites]
        .filter(Boolean).join(' ').toLowerCase().includes(texte));
  }

  if (currentType === 'joueurs') {
    const poste = val('f_poste');
    if (poste) items = items.filter((p) => p.poste === poste || asArray(p.postesJoues).includes(poste));
    const tailleMin = Number(val('f_tailleMin'));
    if (tailleMin) items = items.filter((p) => (p.taille || 0) >= tailleMin);
    const ageMin = Number(val('f_ageMin'));
    const ageMax = Number(val('f_ageMax'));
    if (ageMin || ageMax) {
      items = items.filter((p) => {
        const a = ageFrom(p.dateNaissance);
        if (a == null) return false;
        if (ageMin && a < ageMin) return false;
        if (ageMax && a > ageMax) return false;
        return true;
      });
    }
    const nsm = val('f_niveauSaisonMin');
    if (nsm) items = items.filter((p) => niveauIndex(p.niveauSaisonPassee) >= niveauIndex(nsm));
    const mnm = val('f_meilleurNiveauMin');
    if (mnm) items = items.filter((p) => niveauIndex(p.meilleurNiveau) >= niveauIndex(mnm));
    const car = val('f_caracteristique');
    if (car) items = items.filter((p) => asArray(p.caracteristiques).includes(car));
  } else {
    const niveau = val('f_niveau');
    if (niveau) items = items.filter((p) => (p.kind !== 'club' ? true : niveauIndex(p.niveauPratique) >= niveauIndex(niveau)));
    const posteR = val('f_posteRecherche');
    if (posteR) items = items.filter((p) => (p.kind !== 'club' ? true : asArray(p.profilsRecherches).includes(posteR)));
    const av = val('f_avantage');
    if (av) items = items.filter((p) => (p.kind !== 'club' ? true : asArray(p.avantages).includes(av)));
  }
  return items;
}

function annonceCard(a) {
  const name = a.kind === 'club' ? (a.nomClub || a.displayName || 'Club') : (a.displayName || 'Profil');
  const meta = [a.ville, a.region].filter(Boolean).join(' · ');
  const tags = [];
  if (a.kind === 'club') {
    if (a.niveauPratique) tags.push(a.niveauPratique);
    (a.profilsRecherches || []).slice(0, 3).forEach((t) => tags.push(t));
  } else {
    if (a.poste) tags.push(a.poste);
    if (a.niveauActuel) tags.push(a.niveauActuel);
    const age = ageFrom(a.dateNaissance);
    if (age) tags.push(age + ' ans');
    if (a.taille) tags.push(a.taille + ' cm');
  }
  const ph = a.photo
    ? `<div class="ph"><img src="${escapeHtml(a.photo)}" alt=""></div>`
    : `<div class="ph">${a.kind === 'club' ? '🏟️' : '🏀'}</div>`;
  const agentTag = a.agentManaged ? '<span class="tag">🤝 Représenté par un agent</span>' : '';

  const card = el('a', { href: '/profil.html?id=' + a.id, class: 'annonce' });
  card.innerHTML = `
    ${ph}
    <div class="body">
      <span class="badge ${a.kind}">${kindLabel(a.kind)}</span>
      <div class="title">${escapeHtml(name)}</div>
      ${a.title ? `<div class="sub">${escapeHtml(a.title)}</div>` : ''}
      ${meta ? `<div class="sub">📍 ${escapeHtml(meta)}</div>` : ''}
      <div class="tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}${agentTag}</div>
    </div>`;
  return card;
}

function render() {
  const list = document.getElementById('list');
  const count = document.getElementById('count');
  const items = filtered();
  count.textContent = items.length + ' annonce' + (items.length > 1 ? 's' : '');
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<div class="empty">Aucune annonce ne correspond. Élargis ta recherche ou <a href="/inscription.html">crée la première&nbsp;!</a></div>';
    return;
  }
  items.forEach((a) => list.appendChild(annonceCard(a)));
}

async function load() {
  const count = document.getElementById('count');
  if (!configured) { count.textContent = ''; document.getElementById('list').innerHTML = ''; return; }
  count.textContent = 'Chargement…';
  try {
    cache = await listAnnonces();
    render();
  } catch (err) {
    count.textContent = '';
    document.getElementById('list').innerHTML = `<div class="empty">${escapeHtml(err.message || 'Erreur de chargement.')}</div>`;
  }
}

document.getElementById('applyBtn').addEventListener('click', render);
document.getElementById('resetBtn').addEventListener('click', () => {
  document.querySelectorAll('.adv-body input, .adv-body select').forEach((n) => (n.value = ''));
  render();
});

const initial = new URLSearchParams(location.search).get('type');
if (initial && ['tout', 'joueurs', 'coachs', 'clubs'].includes(initial)) {
  currentType = initial;
  seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.type === initial));
}
updateAdvVisibility();
load();
