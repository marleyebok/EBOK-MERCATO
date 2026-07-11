import { renderHeader } from '../ui.js';
import { register } from '../db.js';

renderHeader('inscription');

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
    await register({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      accountType,
      displayName: document.getElementById('displayName').value.trim(),
    });
    location.href = accountType === 'agent' ? '/agent.html' : '/mon-profil.html';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${escapeHtml(friendlyAuthError(err))}</div>`;
  }
});

function friendlyAuthError(err) {
  const code = (err && err.code) || '';
  if (code.includes('email-already-in-use')) return 'Un compte existe déjà avec cet email.';
  if (code.includes('invalid-email')) return 'Adresse email invalide.';
  if (code.includes('weak-password')) return 'Mot de passe trop faible (6 caractères minimum).';
  return (err && err.message) || 'Erreur lors de la création du compte.';
}
