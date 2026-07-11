import { renderHeader } from '../ui.js';
import { getAnnonce, getSessionOnce, startConversation } from '../db.js';

const { configured } = await renderHeader('');

const content = document.getElementById('content');
if (!configured) { throw new Error('Firebase non configuré'); }

const id = new URLSearchParams(location.search).get('id');
if (!id) { content.innerHTML = '<div class="empty">Annonce introuvable.</div>'; throw new Error('no id'); }

let a;
try {
  a = await getAnnonce(id);
} catch (e) {
  content.innerHTML = `<div class="empty">${escapeHtml(e.message || 'Erreur')}</div>`;
  throw e;
}
if (!a || a.published === false) {
  content.innerHTML = '<div class="empty">Annonce introuvable.</div>';
  throw new Error('not found');
}

const { user } = await getSessionOnce();

const name = a.kind === 'club' ? (a.nomClub || a.displayName || 'Club') : (a.displayName || 'Profil');
const meta = [a.ville, a.region].filter(Boolean).join(' · ');
const avatar = a.photo ? `<img src="${escapeHtml(a.photo)}" alt="">` : (a.kind === 'club' ? '🏟️' : '🏀');

const block = (title, text) =>
  text && String(text).trim()
    ? `<div class="info-block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>` : '';
const chips = (title, arr) =>
  arr && arr.length
    ? `<div class="info-block"><h3>${escapeHtml(title)}</h3><div class="tags">${arr
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div></div>` : '';

let details = '';
if (a.kind === 'club') {
  const kv = [];
  if (a.niveauPratique) kv.push(['Niveau de pratique', a.niveauPratique]);
  if (a.niveauRecherche) kv.push(['Niveau recherché', a.niveauRecherche]);
  if (meta) kv.push(['Lieu', meta]);
  details = `
    <div class="section-grid">
      ${kv.length ? `<div class="info-block"><h3>Infos</h3><dl class="kv">${kv
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl></div>` : ''}
      ${chips('Profils / postes recherchés', a.profilsRecherches)}
      ${block('Projet sportif', a.projetSportif)}
      ${block('Projet humain', a.projetHumain)}
      ${block('Présentation', a.description)}
      ${chips('Avantages proposés', a.avantages)}
    </div>`;
} else {
  const age = ageFrom(a.dateNaissance);
  const kv = [];
  if (a.poste) kv.push(['Poste principal', a.poste]);
  if (age) kv.push(['Âge', age + ' ans']);
  if (a.taille) kv.push(['Taille', a.taille + ' cm']);
  if (a.poids) kv.push(['Poids', a.poids + ' kg']);
  if (a.niveauActuel) kv.push(['Niveau recherché', a.niveauActuel]);
  if (a.niveauSaisonPassee) kv.push(['Niveau saison passée', a.niveauSaisonPassee]);
  if (a.meilleurNiveau) kv.push(['Meilleur niveau atteint', a.meilleurNiveau]);
  if (meta) kv.push(['Lieu', meta]);

  const docs = [];
  if (a.cvSportifFile) docs.push(`<a class="btn ghost small" href="${escapeHtml(a.cvSportifFile)}" target="_blank">📄 CV sportif (PDF)</a>`);
  if (a.cvProFile) docs.push(`<a class="btn ghost small" href="${escapeHtml(a.cvProFile)}" target="_blank">📄 CV professionnel (PDF)</a>`);
  const docsBlock = docs.length
    ? `<div class="info-block"><h3>Documents</h3><div style="display:flex;gap:10px;flex-wrap:wrap">${docs.join('')}</div></div>` : '';

  const vid = youtubeId(a.videoUrl);
  const videoBlock = vid
    ? `<div class="info-block" style="grid-column:1/-1"><h3>Highlights vidéo</h3>
         <div class="video-wrap"><iframe src="https://www.youtube.com/embed/${vid}"
           title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
           allowfullscreen></iframe></div></div>` : '';

  details = `
    <div class="section-grid">
      ${kv.length ? `<div class="info-block"><h3>Fiche</h3><dl class="kv">${kv
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl></div>` : ''}
      ${videoBlock}
      ${chips('Autres postes joués', a.postesJoues)}
      ${chips('Caractéristiques dominantes', a.caracteristiques)}
      ${block('Descriptif du profil', a.description)}
      ${block('Qualités', a.qualites)}
      ${block('Axes de progression', a.axeProgression)}
      ${docsBlock}
      ${block('CV sportif', a.cvSportif)}
      ${block('Palmarès', a.palmares)}
      ${block('Stats saison dernière', a.statsSaisonPassee)}
      ${block('Projet sportif recherché', a.projetRecherche)}
      ${block('Projet professionnel / études', a.projetPro)}
      ${block('Attentes', a.attentes)}
      ${chips('Avantages souhaités', a.avantages)}
      ${block('Espace libre', a.espaceLibre)}
    </div>`;
}

const isOwner = user && user.uid === a.ownerUid;
const agentNote = a.agentManaged ? '<div class="meta">🤝 Profil représenté par un agent</div>' : '';

content.innerHTML = `
  <div class="profile-head">
    <div class="profile-cover">
      <div class="avatar">${avatar}</div>
      <div style="flex:1">
        <span class="badge ${a.kind}" style="background:rgba(255,255,255,.25);color:#fff">${kindLabel(a.kind)}</span>
        <h1>${escapeHtml(name)}</h1>
        ${a.title ? `<div class="slogan">“${escapeHtml(a.title)}”</div>` : ''}
        ${meta ? `<div class="meta">📍 ${escapeHtml(meta)}</div>` : ''}
        ${agentNote}
      </div>
      ${isOwner ? '' : '<button class="btn" id="contactBtn" style="background:#fff;color:var(--green-dark)">✉️ Contacter</button>'}
    </div>
  </div>
  ${details}`;

const contactBtn = document.getElementById('contactBtn');
if (contactBtn) {
  contactBtn.addEventListener('click', async () => {
    if (!user) { location.href = '/connexion.html'; return; }
    contactBtn.disabled = true;
    contactBtn.textContent = 'Ouverture…';
    try {
      const convId = await startConversation(a.ownerUid, a.id, name);
      location.href = '/messages.html?conv=' + encodeURIComponent(convId);
    } catch (e) {
      contactBtn.disabled = false;
      contactBtn.textContent = '✉️ Contacter';
      alert(e.message || 'Impossible de démarrer la conversation.');
    }
  });
}
