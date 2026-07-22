/* En-tête dynamique + gardes d'accès. Identité via Clerk (voir db.js). */
import { getSessionOnce, logout } from './db.js';

const KIND_LABEL = { joueur: 'Joueur', coach: 'Coach', club: 'Club / Équipe', agent: 'Agent' };
export const accountLabel = (t) => KIND_LABEL[t] || t;

export async function renderHeader(active) {
  const nav = document.getElementById('nav');
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
  return { user };
}

// Redirige vers la connexion si non authentifié, ou vers l'onboarding si le
// compte Mercato n'est pas encore finalisé (rôle non choisi). Renvoie la session.
export async function requireAuth() {
  const { user } = await getSessionOnce();
  if (!user) { location.href = '/connexion.html'; return { user: null }; }
  if (!user.accountType) { location.href = '/bienvenue.html'; return { user: null }; }
  return { user };
}
