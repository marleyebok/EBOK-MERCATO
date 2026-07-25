/* En-tête dynamique + gardes d'accès. Identité via Clerk (voir db.js). */
import { getSessionOnce } from './db.js';
import { loadClerk } from './clerk.js';

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

  let userButtonSlot = null;
  if (user) {
    if (user.accountType === 'agent') {
      frag.appendChild(mk('/agent.html', 'Mes joueurs', 'agent'));
    } else {
      frag.appendChild(mk('/mon-profil.html', 'Mon annonce', 'profil'));
    }
    frag.appendChild(mk('/messages.html', 'Messagerie', 'messages'));
    // Avatar Clerk : gère la déconnexion ET « Gérer le compte » (e-mail,
    // mot de passe, sessions, suppression du compte…) — géré par Clerk,
    // pas de code maison à maintenir.
    userButtonSlot = document.createElement('span');
    userButtonSlot.className = 'user-btn-slot';
    frag.appendChild(userButtonSlot);
  } else {
    frag.appendChild(mk('/connexion.html', 'Connexion', 'connexion'));
    frag.appendChild(mk('/inscription.html', 'Créer un compte', '', 'btn small'));
  }
  if (nav) { nav.innerHTML = ''; nav.appendChild(frag); }

  if (userButtonSlot) {
    const clerk = await loadClerk();
    clerk.mountUserButton(userButtonSlot, {
      afterSignOutUrl: '/',
      userProfileMode: 'modal',
    });
  }

  // `configured` reste exposé pour compat : certaines pages (annonces, profil)
  // conditionnent leur chargement dessus. Avec Clerk, le service est toujours prêt.
  return { user, configured: true };
}

// Redirige vers la connexion si non authentifié, ou vers l'onboarding si le
// compte Mercato n'est pas encore finalisé (rôle non choisi). Renvoie la session.
export async function requireAuth() {
  const { user } = await getSessionOnce();
  if (!user) { location.href = '/connexion.html'; return { user: null }; }
  if (!user.accountType) { location.href = '/bienvenue.html'; return { user: null }; }
  return { user };
}
