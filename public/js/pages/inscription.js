import { renderHeader } from '../ui.js';
import { loadClerk } from '../clerk.js';

renderHeader('inscription');

// Inscription gérée par Clerk. `routing: 'hash'` garde les sous-étapes dans le
// fragment d'URL → compatible avec l'hébergement statique (Vercel). Après
// l'inscription, on passe par le questionnaire de bienvenue centralisé sur
// ebok.fr (une seule fois par compte, quelle que soit l'app d'inscription),
// qui redirige ensuite vers /bienvenue.html pour choisir le type de compte
// (joueur/coach, club, agent) et finaliser le profil Mercato.
// `oauthFlow: 'popup'` : Google (et les autres providers OAuth) restent dans
// une popup plutôt qu'une redirection plein écran — la session est déjà
// active quand le composant applique `forceRedirectUrl`, donc l'onboarding
// reconnaît bien l'utilisateur comme connecté dès l'arrivée sur la page.
const RETURN_TO = 'https://mercato.ebok.fr/bienvenue.html';
const clerk = await loadClerk();
clerk.mountSignUp(document.getElementById('clerk-auth'), {
  routing: 'hash',
  signInUrl: '/connexion.html',
  forceRedirectUrl: `https://ebok.fr/onboarding?return_to=${encodeURIComponent(RETURN_TO)}`,
  oauthFlow: 'popup',
});
