import { renderHeader } from '../ui.js';
import { loadClerk } from '../clerk.js';

renderHeader('connexion');

// Connexion gérée par Clerk. `routing: 'hash'` → compatible hébergement
// statique. Après connexion, /bienvenue.html route vers la bonne page selon le
// type de compte (et propose l'onboarding si le compte n'est pas finalisé).
const clerk = await loadClerk();
clerk.mountSignIn(document.getElementById('clerk-auth'), {
  routing: 'hash',
  signUpUrl: '/inscription.html',
  forceRedirectUrl: '/bienvenue.html',
});
