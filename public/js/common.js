/* Helpers DOM partagés (script classique → fonctions globales réutilisables
   par les modules de page). Aucune dépendance réseau ici. */

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

// Champ "niveau" : niveaux français + option "Autre" qui révèle un second menu
// (NCAA, Highschool, Étranger…). Renvoie { getValue() }.
const NIVEAU_AUTRE = 'Autre';
function setupNiveauField(select, { niveaux, autres, placeholder = '—', selected = '' }) {
  fillSelect(select, [...niveaux, NIVEAU_AUTRE], { placeholder });

  const sub = el('select', { class: 'niveau-sub' });
  sub.style.marginTop = '8px';
  fillSelect(sub, autres, { placeholder: '— Précise le parcours —' });
  sub.style.display = 'none';
  select.insertAdjacentElement('afterend', sub);

  function sync() {
    if (select.value === NIVEAU_AUTRE) {
      sub.style.display = '';
    } else {
      sub.style.display = 'none';
      sub.value = '';
    }
  }
  select.addEventListener('change', sync);

  if (selected) {
    if (niveaux.includes(selected)) select.value = selected;
    else if (autres.includes(selected)) { select.value = NIVEAU_AUTRE; sub.value = selected; }
  }
  sync();

  return { getValue: () => (select.value === NIVEAU_AUTRE ? sub.value : select.value) };
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

function kindLabel(kind) {
  return { joueur: 'Joueur', coach: 'Coach', club: 'Club / Équipe' }[kind] || kind;
}

// Extrait l'identifiant d'une vidéo YouTube depuis les formats d'URL courants.
function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
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
