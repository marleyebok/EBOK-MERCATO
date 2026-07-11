/* Page Annonces : filtres Tout/Joueurs/Coachs/Clubs + recherche avancée. */
(async function () {
  await renderHeader('annonces');
  const vocab = await getVocab();

  let currentType = 'tout';

  // Remplissage des selects de recherche
  fillSelect(document.getElementById('f_region'), vocab.regions);
  fillSelect(document.getElementById('f_niveau'), vocab.niveaux);
  fillSelect(document.getElementById('f_posteRecherche'), vocab.postes);
  fillSelect(document.getElementById('f_avantage'), vocab.avantages);
  fillSelect(document.getElementById('f_poste'), vocab.postes);
  fillSelect(document.getElementById('f_niveauSaisonMin'), vocab.niveaux);
  fillSelect(document.getElementById('f_meilleurNiveauMin'), vocab.niveaux);
  fillSelect(document.getElementById('f_caracteristique'), vocab.caracteristiques);

  const advClub = document.getElementById('advClub');
  const advJoueur = document.getElementById('advJoueur');

  function updateAdvVisibility() {
    // Côté "club cherche joueur" quand on filtre les joueurs.
    const joueurMode = currentType === 'joueurs';
    advJoueur.style.display = joueurMode ? '' : 'none';
    // Filtres orientés club, utiles pour "tout", "clubs" et "coachs".
    advClub.style.display = joueurMode ? 'none' : '';
  }

  // Segmented filter
  const seg = document.getElementById('filterSeg');
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    currentType = b.dataset.type;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    updateAdvVisibility();
    load();
  });

  function buildQuery() {
    const p = new URLSearchParams();
    p.set('type', currentType);
    const val = (id) => (document.getElementById(id).value || '').trim();
    const put = (k, id) => { const v = val(id); if (v) p.set(k, v); };

    put('texte', 'f_texte');
    put('region', 'f_region');

    if (currentType === 'joueurs') {
      put('poste', 'f_poste');
      put('tailleMin', 'f_tailleMin');
      put('ageMin', 'f_ageMin');
      put('ageMax', 'f_ageMax');
      put('niveauSaisonMin', 'f_niveauSaisonMin');
      put('meilleurNiveauMin', 'f_meilleurNiveauMin');
      put('caracteristique', 'f_caracteristique');
    } else {
      put('niveau', 'f_niveau');
      put('posteRecherche', 'f_posteRecherche');
      put('avantage', 'f_avantage');
    }
    return p.toString();
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

    const card = el('a', { href: '/profil.html?id=' + a.id, class: 'annonce' });
    card.innerHTML = `
      ${ph}
      <div class="body">
        <span class="badge ${a.kind}">${kindLabel(a.kind)}</span>
        <div class="title">${escapeHtml(name)}</div>
        ${a.title ? `<div class="sub">${escapeHtml(a.title)}</div>` : ''}
        ${meta ? `<div class="sub">📍 ${escapeHtml(meta)}</div>` : ''}
        <div class="tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>`;
    return card;
  }

  async function load() {
    const list = document.getElementById('list');
    const count = document.getElementById('count');
    list.innerHTML = '';
    count.textContent = 'Chargement…';
    try {
      const { annonces } = await api('/api/annonces?' + buildQuery());
      count.textContent = annonces.length + ' annonce' + (annonces.length > 1 ? 's' : '');
      if (!annonces.length) {
        list.innerHTML = '<div class="empty">Aucune annonce ne correspond. Élargis ta recherche ou <a href="/inscription.html">crée la première&nbsp;!</a></div>';
        return;
      }
      annonces.forEach((a) => list.appendChild(annonceCard(a)));
    } catch (err) {
      count.textContent = '';
      list.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  document.getElementById('applyBtn').addEventListener('click', load);
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.querySelectorAll('.adv-body input, .adv-body select').forEach((n) => (n.value = ''));
    load();
  });

  // Support d'un lien direct type ?type=clubs
  const initial = new URLSearchParams(location.search).get('type');
  if (initial && ['tout', 'joueurs', 'coachs', 'clubs'].includes(initial)) {
    currentType = initial;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.type === initial));
  }

  updateAdvVisibility();
  load();
})();
