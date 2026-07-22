import { renderHeader } from '../ui.js';
import { loadClerk } from '../clerk.js';

renderHeader('inscription');

// Inscription gérée par Clerk. `routing: 'hash'` garde les sous-étapes dans le
// fragment d'URL → compatible avec l'hébergement statique (Vercel). Après
// l'inscription, on redirige vers /bienvenue.html pour choisir le type de
// compte (joueur/coach, club, agent) et finaliser le profil Mercato.
const clerk = await loadClerk();
clerk.mountSignUp(document.getElementById('clerk-auth'), {
  routing: 'hash',
  signInUrl: '/connexion.html',
  forceRedirectUrl: '/bienvenue.html',
});
