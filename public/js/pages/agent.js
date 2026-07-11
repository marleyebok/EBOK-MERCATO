import { renderHeader, requireAuth } from '../ui.js';
import { listManagedProfiles, deleteManagedProfile } from '../db.js';

await renderHeader('agent');
const { user } = await requireAuth();
if (!user) throw new Error('non authentifié');
if (user.accountType !== 'agent') { location.href = '/mon-profil.html'; throw new Error('redirect'); }

const list = document.getElementById('list');

function card(p) {
  const name = p.displayName || 'Joueur sans nom';
  const meta = [p.ville, p.region].filter(Boolean).join(' · ');
  const ph = p.photo ? `<div class="ph"><img src="${escapeHtml(p.photo)}" alt=""></div>` : '<div class="ph">🏀</div>';
  const tags = [];
  if (p.poste) tags.push(p.poste);
  if (p.niveauActuel) tags.push(p.niveauActuel);
  if (p.published === false) tags.push('🔒 Non publiée');

  const wrap = el('div', { class: 'annonce' });
  wrap.innerHTML = `
    ${ph}
    <div class="body">
      <span class="badge ${p.kind}">${kindLabel(p.kind)}</span>
      <div class="title">${escapeHtml(name)}</div>
      ${p.title ? `<div class="sub">${escapeHtml(p.title)}</div>` : ''}
      ${meta ? `<div class="sub">📍 ${escapeHtml(meta)}</div>` : ''}
      <div class="tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <a class="btn small ghost" href="/mon-profil.html?managed=1&id=${encodeURIComponent(p.id)}">Modifier</a>
        <a class="btn small ghost" href="/profil.html?id=${encodeURIComponent(p.id)}">Voir</a>
        <button class="btn small ghost" data-del="${escapeHtml(p.id)}" style="border-color:#e0b4b0;color:#b12a1b">Supprimer</button>
      </div>
    </div>`;
  return wrap;
}

async function load() {
  list.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const items = await listManagedProfiles();
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div class="empty">Aucun joueur pour l\'instant. Clique sur « + Ajouter un joueur » pour créer ta première fiche.</div>';
      return;
    }
    items.forEach((p) => list.appendChild(card(p)));
  } catch (err) {
    list.innerHTML = `<div class="empty">${escapeHtml(err.message || 'Erreur')}</div>`;
  }
}

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-del]');
  if (!btn) return;
  if (!confirm('Supprimer définitivement cette fiche joueur ?')) return;
  btn.disabled = true;
  try { await deleteManagedProfile(btn.dataset.del); await load(); }
  catch (err) { alert(err.message || 'Suppression impossible.'); btn.disabled = false; }
});

load();
