/* Édition de l'annonce (joueur/coach ou club). */
(async function () {
  const { user, profile } = await renderHeader('profil');
  if (!user) { location.href = '/connexion.html'; return; }

  const vocab = await getVocab();
  const isClub = user.accountType === 'club';

  // Affiche le bon bloc
  document.getElementById('blocMembre').style.display = isClub ? 'none' : '';
  document.getElementById('blocClub').style.display = isClub ? '' : 'none';
  document.getElementById('kindRow').style.display = isClub ? 'none' : '';

  // Sélecteur joueur / coach (membres)
  let kind = isClub ? 'club' : (profile && profile.kind) || 'joueur';
  const kindSeg = document.getElementById('kindSeg');
  function refreshKind() {
    kindSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
    document.getElementById('nameLabel').textContent = 'Nom affiché';
  }
  kindSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    kind = b.dataset.kind; refreshKind();
  });
  refreshKind();

  // Remplissage des listes
  fillSelect(document.getElementById('region'), vocab.regions, { selected: profile?.region });
  fillSelect(document.getElementById('poste'), vocab.postes, { placeholder: '—', selected: profile?.poste });
  const niveauGroups = [
    { label: 'Niveaux', values: vocab.niveaux },
    { label: 'Autres parcours', values: vocab.autresParcours },
  ];
  ['niveauActuel', 'niveauSaisonPassee', 'meilleurNiveau', 'niveauPratique', 'niveauRecherche'].forEach((k) => {
    fillSelectGrouped(document.getElementById(k), niveauGroups, { placeholder: '—', selected: profile?.[k] });
  });
  buildChecks(document.getElementById('postesJoues'), vocab.postes, 'postesJoues', profile?.postesJoues);
  buildChecks(document.getElementById('caracteristiques'), vocab.caracteristiques, 'caracteristiques', profile?.caracteristiques);
  buildChecks(document.getElementById('avantagesMembre'), vocab.avantages, 'avantagesMembre', profile?.avantages);
  buildChecks(document.getElementById('avantagesClub'), vocab.avantages, 'avantagesClub', profile?.avantages);
  buildChecks(document.getElementById('profilsRecherches'), vocab.postes, 'profilsRecherches', profile?.profilsRecherches);

  // Pré-remplissage des champs texte
  const setVal = (id, v) => { const n = document.getElementById(id); if (n) n.value = v == null ? '' : v; };
  if (profile) {
    ['title', 'displayName', 'ville', 'dateNaissance', 'taille', 'poids', 'qualites',
     'axeProgression', 'cvSportif', 'palmares', 'statsSaisonPassee', 'projetRecherche',
     'projetPro', 'attentes', 'espaceLibre', 'nomClub', 'projetSportif', 'projetHumain']
      .forEach((k) => setVal(k, profile[k]));
    setVal('description', isClub ? '' : profile.description);
    setVal('descriptionClub', isClub ? profile.description : '');
    document.getElementById('photo').value = profile.photo || '';
    document.getElementById('published').checked = profile.published !== false;
    if (profile.photo) document.getElementById('photoStatus').innerHTML =
      `<a href="${escapeHtml(profile.photo)}" target="_blank">Photo actuelle</a>`;
    const vl = document.getElementById('viewLink');
    vl.style.display = ''; vl.href = '/profil.html?id=' + profile.id;
  }

  // Upload photo
  document.getElementById('photoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const status = document.getElementById('photoStatus');
    status.textContent = 'Envoi en cours…';
    try {
      const fd = new FormData(); fd.append('photo', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'envoi');
      document.getElementById('photo').value = data.url;
      status.innerHTML = `<a href="${escapeHtml(data.url)}" target="_blank">Photo envoyée ✓</a>`;
    } catch (err) { status.textContent = err.message; }
  });

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
        niveauPratique: g('niveauPratique'),
        niveauRecherche: g('niveauRecherche'),
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
        taille: g('taille'),
        poids: g('poids'),
        poste: g('poste'),
        postesJoues: getChecked(document.getElementById('postesJoues'), 'postesJoues'),
        niveauActuel: g('niveauActuel'),
        niveauSaisonPassee: g('niveauSaisonPassee'),
        meilleurNiveau: g('meilleurNiveau'),
        caracteristiques: getChecked(document.getElementById('caracteristiques'), 'caracteristiques'),
        description: g('description'),
        qualites: g('qualites'),
        axeProgression: g('axeProgression'),
        cvSportif: g('cvSportif'),
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
      const { profile: saved } = await api('/api/profile', { method: 'POST', body: JSON.stringify(payload) });
      msg.innerHTML = '<div class="msg ok">Annonce enregistrée ✓</div>';
      const vl = document.getElementById('viewLink');
      vl.style.display = ''; vl.href = '/profil.html?id=' + saved.id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      msg.innerHTML = `<div class="msg err">${escapeHtml(err.message)}</div>`;
    }
  });
})();
