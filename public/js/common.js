/* Helpers partagés + header dynamique selon l'état de connexion. */

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* pas de corps JSON */ }
  if (!res.ok) throw new Error((data && data.error) || 'Erreur serveur');
  return data;
}

let _vocab = null;
async function getVocab() {
  if (_vocab) return _vocab;
  _vocab = await api('/api/vocab');
  return _vocab;
}

async function getSession() {
  try { return await api('/api/me'); }
  catch (e) { return { user: null, profile: null }; }
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fillSelect(select, values, { placeholder = '— Indifférent —', selected = '' } = {}) {
  select.innerHTML = '';
  if (placeholder !== null) select.appendChild(el('option', { value: '' }, placeholder));
  values.forEach((v) => {
    const o = el('option', { value: v }, v);
    if (v === selected) o.selected = true;
    select.appendChild(o);
  });
}

// Remplit un select avec des groupes : groups = [{ label, values }, ...]
function fillSelectGrouped(select, groups, { placeholder = '— Indifférent —', selected = '' } = {}) {
  select.innerHTML = '';
  if (placeholder !== null) select.appendChild(el('option', { value: '' }, placeholder));
  groups.forEach(({ label, values }) => {
    const og = el('optgroup', { label });
    values.forEach((v) => {
      const o = el('option', { value: v }, v);
      if (v === selected) o.selected = true;
      og.appendChild(o);
    });
    select.appendChild(og);
  });
}

function buildChecks(container, values, name, selected = []) {
  container.innerHTML = '';
  const sel = new Set(selected || []);
  values.forEach((v) => {
    const input = el('input', { type: 'checkbox', name, value: v });
    if (sel.has(v)) input.checked = true;
    container.appendChild(el('label', {}, [input, ' ' + v]));
  });
}

function getChecked(container, name) {
  return Array.from(container.querySelectorAll(`input[name="${name}"]:checked`)).map((i) => i.value);
}

async function renderHeader(active) {
  const { user, profile } = await getSession();
  const nav = document.getElementById('nav');
  if (!nav) return { user, profile };

  const links = [
    ['/', 'Accueil', 'accueil'],
    ['/annonces.html', 'Annonces', 'annonces'],
  ];
  const frag = document.createDocumentFragment();
  links.forEach(([href, label, key]) => {
    frag.appendChild(el('a', { href, class: active === key ? 'active' : '' }, label));
  });

  if (user) {
    frag.appendChild(el('a', { href: '/mon-profil.html', class: active === 'profil' ? 'active' : '' }, 'Mon annonce'));
    frag.appendChild(
      el('a', {
        href: '#',
        onclick: async (e) => { e.preventDefault(); await api('/api/logout', { method: 'POST' }); location.href = '/'; },
      }, 'Déconnexion')
    );
  } else {
    frag.appendChild(el('a', { href: '/connexion.html', class: active === 'connexion' ? 'active' : '' }, 'Connexion'));
    frag.appendChild(el('a', { href: '/inscription.html', class: 'btn small' }, 'Créer un compte'));
  }
  nav.innerHTML = '';
  nav.appendChild(frag);
  return { user, profile };
}

function kindLabel(kind) {
  return { joueur: 'Joueur', coach: 'Coach', club: 'Club / Équipe' }[kind] || kind;
}

function ageFrom(dateNaissance) {
  if (!dateNaissance) return null;
  const b = new Date(dateNaissance);
  if (isNaN(b)) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}
