/* Affichage public d'une annonce détaillée. */
(async function () {
  await renderHeader('');
  const id = new URLSearchParams(location.search).get('id');
  const content = document.getElementById('content');
  if (!id) { content.innerHTML = '<div class="empty">Annonce introuvable.</div>'; return; }

  let a;
  try {
    ({ annonce: a } = await api('/api/annonces/' + id));
  } catch (e) {
    content.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
    return;
  }

  const name = a.kind === 'club' ? (a.nomClub || a.displayName || 'Club') : (a.displayName || 'Profil');
  const meta = [a.ville, a.region].filter(Boolean).join(' · ');
  const avatar = a.photo
    ? `<img src="${escapeHtml(a.photo)}" alt="">`
    : (a.kind === 'club' ? '🏟️' : '🏀');

  const block = (title, text) =>
    text && String(text).trim()
      ? `<div class="info-block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`
      : '';

  const chips = (title, arr) =>
    arr && arr.length
      ? `<div class="info-block"><h3>${escapeHtml(title)}</h3><div class="tags">${arr
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join('')}</div></div>`
      : '';

  let details = '';

  if (a.kind === 'club') {
    const kv = [];
    if (a.niveauPratique) kv.push(['Niveau de pratique', a.niveauPratique]);
    if (a.niveauRecherche) kv.push(['Niveau recherché', a.niveauRecherche]);
    if (meta) kv.push(['Lieu', meta]);
    details = `
      <div class="section-grid">
        ${kv.length ? `<div class="info-block"><h3>Infos</h3><dl class="kv">${kv
          .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
          .join('')}</dl></div>` : ''}
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

    details = `
      <div class="section-grid">
        ${kv.length ? `<div class="info-block"><h3>Fiche</h3><dl class="kv">${kv
          .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
          .join('')}</dl></div>` : ''}
        ${chips('Autres postes joués', a.postesJoues)}
        ${chips('Caractéristiques dominantes', a.caracteristiques)}
        ${block('Descriptif du profil', a.description)}
        ${block('Qualités', a.qualites)}
        ${block('Axes de progression', a.axeProgression)}
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

  content.innerHTML = `
    <div class="profile-head">
      <div class="profile-cover">
        <div class="avatar">${avatar}</div>
        <div>
          <span class="badge ${a.kind}" style="background:rgba(255,255,255,.25);color:#fff">${kindLabel(a.kind)}</span>
          <h1>${escapeHtml(name)}</h1>
          ${a.title ? `<div class="slogan">“${escapeHtml(a.title)}”</div>` : ''}
          ${meta ? `<div class="meta">📍 ${escapeHtml(meta)}</div>` : ''}
        </div>
      </div>
    </div>
    ${details}`;
})();
