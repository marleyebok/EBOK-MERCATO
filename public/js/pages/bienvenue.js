import { renderHeader } from '../ui.js';
import { getSessionOnce, onboard } from '../db.js';

renderHeader('');

const { user } = await getSessionOnce();

// Pas connecté à Clerk → vers la connexion.
if (!user) {
  location.href = '/connexion.html';
} else if (user.accountType) {
  // Compte déjà finalisé → on route vers l'espace adapté.
  location.href = user.accountType === 'agent' ? '/agent.html' : '/mon-profil.html';
} else {
  // Compte Clerk sans rôle Mercato → on affiche l'onboarding.
  document.getElementById('loading').style.display = 'none';
  document.getElementById('onboard').style.display = '';

  let accountType = 'membre';
  const seg = document.getElementById('typeSeg');
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    accountType = b.dataset.type;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    // Le nom affiché est demandé pour club/agent (nom du club / de l'agence).
    document.getElementById('nameWrap').style.display = accountType === 'membre' ? 'none' : '';
  });

  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    msg.innerHTML = '';
    try {
      await onboard({
        accountType,
        displayName: document.getElementById('displayName').value.trim(),
      });
      location.href = accountType === 'agent' ? '/agent.html' : '/mon-profil.html';
    } catch (err) {
      msg.innerHTML = `<div class="msg err">${escapeHtml((err && err.message) || 'Une erreur est survenue.')}</div>`;
    }
  });
}
