/* En-tête dynamique + gardes d'accès. Dépend de db.js (Firebase). */
import { getSessionOnce, logout, isConfigured } from './db.js';

const KIND_LABEL = { joueur: 'Joueur', coach: 'Coach', club: 'Club / Équipe', agent: 'Agent' };
export const accountLabel = (t) => KIND_LABEL[t] || t;

// Bannière si la config Firebase n'est pas renseignée.
function configBanner() {
  const div = document.createElement('div');
  div.className = 'msg err';
  div.style.margin = '20px auto';
  div.style.maxWidth = '900px';
  div.innerHTML =
    'Firebase n\'est pas encore configuré. Renseigne <code>public/js/firebase-config.js</code> ' +
    'avec la config de ton projet (voir le <strong>README</strong>).';
  return div;
}

export async function renderHeader(active) {
  const nav = document.getElementById('nav');
  if (!isConfigured()) {
    const main = document.querySelector('main') || document.body;
    main.prepend(configBanner());
  }
  const { user } = await getSessionOnce();

  const links = [
    ['/', 'Accueil', 'accueil'],
    ['/annonces.html', 'Annonces', 'annonces'],
  ];
  const frag = document.createDocumentFragment();
  const mk = (href, label, key, cls) => {
    const a = document.createElement('a');
    a.href = href; a.textContent = label;
    a.className = (cls || '') + (active === key ? ' active' : '');
    return a;
  };
  links.forEach(([h, l, k]) => frag.appendChild(mk(h, l, k)));

  if (user) {
    if (user.accountType === 'agent') {
      frag.appendChild(mk('/agent.html', 'Mes joueurs', 'agent'));
    } else {
      frag.appendChild(mk('/mon-profil.html', 'Mon annonce', 'profil'));
    }
    frag.appendChild(mk('/messages.html', 'Messagerie', 'messages'));
    const out = mk('#', 'Déconnexion', 'logout');
    out.addEventListener('click', async (e) => { e.preventDefault(); await logout(); location.href = '/'; });
    frag.appendChild(out);
  } else {
    frag.appendChild(mk('/connexion.html', 'Connexion', 'connexion'));
    frag.appendChild(mk('/inscription.html', 'Créer un compte', '', 'btn small'));
  }
  if (nav) { nav.innerHTML = ''; nav.appendChild(frag); }
  return { user, configured: isConfigured() };
}

// Redirige vers la connexion si non authentifié. Renvoie la session.
export async function requireAuth() {
  const { configured, user } = await getSessionOnce();
  if (!configured) return { user: null };
  if (!user) { location.href = '/connexion.html'; return { user: null }; }
  return { user };
}
