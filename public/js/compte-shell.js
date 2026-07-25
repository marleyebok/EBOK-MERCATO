/**
 * Coquille de l'espace compte (/compte) — sidebar repliable listant toute la
 * galaxie EBOK + portail de connexion.
 *
 * Même structure que les autres apps (cf. Playbook) : un compte unique, la
 * même page de réglages partout. La sidebar est construite ici (et pas dans
 * chaque page HTML) pour rester identique d'une section à l'autre.
 */
import { loadClerk } from './clerk.js';

// Ordre alphabétique ; Mercato = app courante (url null → non cliquable).
// Les apps qui ont leur propre /compte/profil pointent directement dessus.
const APPS = [
  { name: 'Basketball', color: '#1F6FE5', url: 'https://ebok.fr/compte/profil' },
  { name: 'Académie', color: '#8A4CE0', url: 'https://academie.ebok.fr/' },
  { name: 'Blog', color: '#C8317E', url: 'https://blog.ebok.fr/' },
  { name: 'Event', color: '#E23A3A', url: 'https://event.ebok.fr/compte/profil' },
  { name: 'Forum', color: '#18A0C4', url: 'https://forum.ebok.fr/' },
  { name: 'Médias', color: '#C9A227', url: 'https://medias.ebok.fr/' },
  { name: 'Mercato', color: '#4CA62E', url: null },
  { name: 'Notebook', color: '#7A86A0', url: 'https://notebook.ebok.fr/' },
  { name: 'Playbook', color: '#E08A2B', url: 'https://playbook.ebok.fr/compte/profil' },
  { name: 'Scouting', color: '#EA5A3C', url: 'https://scouting.ebok.fr/' },
  { name: 'Stats', color: '#2E6FD6', url: 'https://stats.ebok.fr/' },
  { name: 'Vidéo', color: '#1FA98C', url: 'https://video.ebok.fr/compte/profil' },
  { name: 'Workout', color: '#A3BD18', url: 'https://workout.ebok.fr/' },
];

// Sous-sections de Mercato.
const SUB = [
  { href: '/mon-profil.html', icon: '📣', label: 'Mon annonce' },
  { href: '/annonces.html', icon: '🔎', label: 'Les annonces' },
  { href: '/messages.html', icon: '✉️', label: 'Messages' },
];

const COLLAPSE_KEY = 'ebokm-dash-collapsed';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function sidebarHtml(current) {
  const item = (app) =>
    app.url === null
      ? `<div class="dash-group">
           <div class="dash-item dash-current">
             <span class="dash-sq" style="background:${app.color}">${esc(app.name.charAt(0))}</span>
             <span class="dash-label">${esc(app.name)}</span>
           </div>
           <div class="dash-sub">
             ${SUB.map(
               (s) => `<a class="dash-subitem" href="${s.href}">
                         <span class="dash-ic">${s.icon}</span>
                         <span class="dash-label">${esc(s.label)}</span>
                       </a>`
             ).join('')}
           </div>
         </div>`
      : `<a class="dash-item" href="${app.url}">
           <span class="dash-sq" style="background:${app.color}">${esc(app.name.charAt(0))}</span>
           <span class="dash-label">${esc(app.name)}</span>
           <span class="dash-ext dash-label">↗</span>
         </a>`;

  return `
    <div class="dash-top">
      <a class="dash-logo" href="/" title="Retour au site">
        <span class="dash-logo-ball">🏀</span>
        <span class="dash-label dash-logo-txt">EBOK <b>MERCATO</b></span>
      </a>
      <button class="dash-collapse" type="button" id="dashCollapse" title="Réduire">‹</button>
    </div>
    <nav class="dash-nav">
      <a class="dash-item${current === 'profil' ? ' active' : ''}" href="/compte/profil">
        <span class="dash-ic">👤</span><span class="dash-label">Mon profil</span>
      </a>
      <div class="dash-section-label dash-label">Applications</div>
      ${APPS.map(item).join('')}
    </nav>
    <div class="dash-bottom">
      <a class="dash-item${current === 'general' ? ' active' : ''}" href="/compte/general">
        <span class="dash-ic">⚙️</span><span class="dash-label">Général</span>
      </a>
      <div class="dash-user dash-label" id="dashUser"></div>
    </div>`;
}

function gateHtml() {
  return `
    <div class="dash-gate-card">
      <div class="dash-logo" style="justify-content:center;margin-bottom:10px">
        <span class="dash-logo-ball">🏀</span>
        <span class="dash-logo-txt">EBOK <b>MERCATO</b></span>
      </div>
      <h1>Ton espace</h1>
      <p>Connecte-toi ou crée ton compte EBOK (le compte unique de toute la galaxie) pour accéder à ton profil.</p>
      <div class="dash-gate-actions">
        <a class="dash-btn ghost" href="/connexion.html">Connexion</a>
        <a class="dash-btn" href="/inscription.html">Créer un compte</a>
      </div>
      <a class="dash-gate-back" href="/">← Retour au site</a>
    </div>`;
}

function showGate() {
  const gate = document.createElement('div');
  gate.className = 'dash-gate';
  gate.innerHTML = gateHtml();
  document.body.appendChild(gate);
}

/**
 * Monte la coquille et résout l'état connecté.
 * @param {'profil'|'general'} current section courante (état actif de la sidebar)
 * @returns {Promise<object|null>} l'instance Clerk si connecté, sinon null
 */
export async function mountCompteShell(current) {
  const dash = document.getElementById('dash');
  const side = document.getElementById('dashSide');
  side.innerHTML = sidebarHtml(current);

  // Sidebar repliable, mémorisée d'une visite à l'autre.
  const btn = document.getElementById('dashCollapse');
  const apply = (on) => {
    dash.classList.toggle('collapsed', on);
    btn.textContent = on ? '›' : '‹';
    btn.title = on ? 'Déplier' : 'Réduire';
  };
  apply(localStorage.getItem(COLLAPSE_KEY) === '1');
  btn.addEventListener('click', () => {
    const on = !dash.classList.contains('collapsed');
    localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0');
    apply(on);
  });

  let clerk;
  try {
    clerk = await loadClerk();
  } catch (err) {
    // Clerk injoignable : on montre le portail plutôt qu'une page vide.
    console.error('[EBOK] Échec du chargement de Clerk :', err);
    showGate();
    return null;
  }

  if (!clerk.user) {
    showGate();
    return null;
  }

  const u = clerk.user;
  document.getElementById('dashUser').textContent =
    u.firstName || u.username || u.primaryEmailAddress?.emailAddress || 'Mon compte';
  dash.hidden = false;
  return clerk;
}
