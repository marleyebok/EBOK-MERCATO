import { renderHeader } from '../ui.js';
import { login, getSessionOnce } from '../db.js';

renderHeader('connexion');

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  msg.innerHTML = '';
  try {
    await login({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    });
    const { user } = await getSessionOnce();
    location.href = user && user.accountType === 'agent' ? '/agent.html' : '/mon-profil.html';
  } catch (err) {
    const code = (err && err.code) || '';
    const message = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)
      ? 'Email ou mot de passe incorrect.'
      : (err && err.message) || 'Erreur de connexion.';
    msg.innerHTML = `<div class="msg err">${escapeHtml(message)}</div>`;
  }
});
