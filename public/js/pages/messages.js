import { renderHeader, requireAuth } from '../ui.js';
import {
  watchConversations, watchMessages, sendMessage, getConversation, getUserPublic,
} from '../db.js';

await renderHeader('messages');
const { user } = await requireAuth();
if (!user) throw new Error('non authentifié');

const me = user.uid;
const convListEl = document.getElementById('convList');
const threadEl = document.getElementById('thread');
const nameCache = new Map();
let activeConvId = new URLSearchParams(location.search).get('conv') || null;
let unsubMessages = null;
let conversations = [];

async function nameFor(otherUid) {
  if (nameCache.has(otherUid)) return nameCache.get(otherUid);
  const u = await getUserPublic(otherUid);
  const label = u.displayName || u.email || 'Utilisateur';
  nameCache.set(otherUid, label);
  return label;
}

function otherOf(conv) {
  return (conv.participants || []).find((p) => p !== me) || '';
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function renderConvList() {
  if (!conversations.length) {
    convListEl.innerHTML = '<div class="empty">Aucune conversation.</div>';
    return;
  }
  convListEl.innerHTML = '';
  for (const conv of conversations) {
    const who = await nameFor(otherOf(conv));
    const item = el('div', { class: 'conv-item' + (conv.id === activeConvId ? ' active' : '') });
    item.dataset.id = conv.id;
    item.innerHTML = `
      <div class="who">${escapeHtml(who)}</div>
      ${conv.aboutTitle ? `<div class="about">${escapeHtml(conv.aboutTitle)}</div>` : ''}
      <div class="last">${escapeHtml(conv.lastMessage || 'Nouvelle conversation')}</div>`;
    item.addEventListener('click', () => openConversation(conv.id));
    convListEl.appendChild(item);
  }
}

async function openConversation(convId) {
  activeConvId = convId;
  history.replaceState(null, '', '/messages.html?conv=' + encodeURIComponent(convId));
  convListEl.querySelectorAll('.conv-item').forEach((n) => n.classList.toggle('active', n.dataset.id === convId));

  const conv = conversations.find((c) => c.id === convId) || (await getConversation(convId));
  if (!conv) { threadEl.innerHTML = '<div class="empty">Conversation introuvable.</div>'; return; }
  const who = await nameFor(otherOf(conv));

  threadEl.innerHTML = `
    <div class="thread-head">${escapeHtml(who)}${conv.aboutTitle ? `<span class="sub"> · à propos de ${escapeHtml(conv.aboutTitle)}</span>` : ''}</div>
    <div class="thread-body" id="threadBody"><div class="empty">Chargement…</div></div>
    <form class="thread-form" id="sendForm">
      <input type="text" id="msgInput" placeholder="Écris ton message…" autocomplete="off" />
      <button class="btn" type="submit">Envoyer</button>
    </form>`;

  const body = document.getElementById('threadBody');
  if (unsubMessages) unsubMessages();
  unsubMessages = watchMessages(convId, (messages) => {
    if (!messages.length) { body.innerHTML = '<div class="empty">Démarre la conversation 👋</div>'; return; }
    body.innerHTML = '';
    messages.forEach((m) => {
      const mine = m.senderUid === me;
      const b = el('div', { class: 'bubble ' + (mine ? 'me' : 'them') });
      b.innerHTML = `${escapeHtml(m.text)}<span class="time">${escapeHtml(fmtTime(m.createdAt))}</span>`;
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  });

  document.getElementById('sendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('msgInput');
    const text = input.value;
    input.value = '';
    try { await sendMessage(convId, text); }
    catch (err) { alert(err.message || 'Envoi impossible.'); input.value = text; }
  });
}

// Flux temps réel des conversations
watchConversations((items) => {
  conversations = items;
  renderConvList().then(() => {
    if (activeConvId && !threadEl.querySelector('.thread-head')) openConversation(activeConvId);
  });
});
