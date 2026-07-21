/**
 * Couche de données EBOK-MERCATO — désormais sur Neon (via les fonctions
 * serverless /api/*), en remplacement de Firebase.
 *
 * Les signatures exportées sont IDENTIQUES à l'ancienne version Firebase :
 * les pages (annonces, mon-profil, agent, messages…) n'ont pas à changer.
 *
 * Modèle (voir api/_lib.js) :
 *   shared.users / mercato.accounts : identité + rôle (membre|club|agent)
 *   mercato.profiles                : annonces (JSONB)
 *   mercato.conversations/messages  : messagerie (polling, pas de temps réel)
 */

let _session = null; // { uid, email, displayName, accountType } | null

async function api(path, { method = "GET", body, headers, raw } = {}) {
  const opts = { method, credentials: "include", headers: headers || {} };
  if (body !== undefined) {
    if (raw) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, opts);
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

const ERRORS = {
  email_pris: "Cet e-mail est déjà utilisé.",
  identifiants: "E-mail ou mot de passe incorrect.",
  password_court: "Mot de passe trop court (6 caractères minimum).",
  email: "Adresse e-mail invalide.",
  db_unavailable: "Service indisponible — base de données non configurée.",
  auth: "Vous devez être connecté.",
};
function fail(data) {
  return new Error(ERRORS[data && data.error] || "Une erreur est survenue.");
}

// Compat : plus de Firebase à initialiser. Le service est prêt dès qu'il y a une base.
export function initFirebase() { return true; }
export function isConfigured() { return true; }
export const uid = () => (_session ? _session.uid : null);

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------
export async function register({ email, password, accountType, displayName }) {
  const { ok, data } = await api("/api/auth", { method: "POST", body: { action: "register", email, password, accountType, displayName } });
  if (!ok) throw fail(data);
  _session = data.user;
  return data.user;
}

export async function login({ email, password }) {
  const { ok, data } = await api("/api/auth", { method: "POST", body: { action: "login", email, password } });
  if (!ok) throw fail(data);
  _session = data.user;
  return data.user;
}

export async function logout() {
  await api("/api/auth", { method: "POST", body: { action: "logout" } });
  _session = null;
}

export async function getSessionOnce() {
  const { data } = await api("/api/auth");
  _session = data.user || null;
  return { configured: true, user: _session };
}

// ---------------------------------------------------------------------------
// Profils / annonces
// ---------------------------------------------------------------------------
export async function getMyProfile() {
  const { data } = await api("/api/profiles?mine=1");
  return data.profile || null;
}
export async function saveMyProfile(payload) {
  const { ok, data } = await api("/api/profiles", { method: "POST", body: payload });
  if (!ok) throw fail(data);
  return data.profile;
}
export async function getAnnonce(id) {
  const { ok, data } = await api("/api/profiles?id=" + encodeURIComponent(id));
  return ok ? data.profile : null;
}
export async function listAnnonces() {
  const { data } = await api("/api/profiles");
  return data.profiles || [];
}

// ---------------------------------------------------------------------------
// Agent : gestion de plusieurs joueurs
// ---------------------------------------------------------------------------
export async function listManagedProfiles() {
  const { data } = await api("/api/profiles?managed=1");
  return data.profiles || [];
}
export async function getManagedProfile(id) {
  const { data } = await api("/api/profiles?managed=1&id=" + encodeURIComponent(id));
  return data.profile || null;
}
export async function saveManagedProfile(id, payload) {
  const body = { ...payload, managed: 1 };
  if (id) body.id = id;
  const { ok, data } = await api("/api/profiles", { method: "POST", body });
  if (!ok) throw fail(data);
  return data.profile;
}
export async function deleteManagedProfile(id) {
  await api("/api/profiles?id=" + encodeURIComponent(id), { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Fichiers (photos, PDF) → Vercel Blob
// ---------------------------------------------------------------------------
export async function uploadFile(file, folder = "divers") {
  const { ok, data } = await api("/api/upload", {
    method: "POST",
    raw: true,
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-filename": file.name || "fichier",
      "x-folder": folder,
    },
  });
  if (!ok) throw fail(data);
  return data.url;
}

// ---------------------------------------------------------------------------
// Messagerie (polling au lieu du temps réel Firestore)
// ---------------------------------------------------------------------------
export function conversationId(otherUid, aboutProfileId) {
  const pair = [uid(), otherUid].sort().join("__");
  return aboutProfileId ? `${pair}__${aboutProfileId}` : pair;
}

export async function startConversation(otherUid, aboutProfileId, aboutTitle) {
  const { ok, data } = await api("/api/messages", { method: "POST", body: { action: "start", otherUid, aboutProfileId, aboutTitle } });
  if (!ok) throw fail(data);
  return data.convId;
}

export async function sendMessage(convId, text) {
  const clean = (text || "").trim();
  if (!clean) return;
  const { ok, data } = await api("/api/messages", { method: "POST", body: { action: "send", convId, text: clean } });
  if (!ok) throw fail(data);
}

/** Interroge la liste des conversations en boucle (retourne une fonction d'arrêt). */
export function watchConversations(cb) {
  let stop = false;
  async function tick() {
    if (stop) return;
    try {
      const { data } = await api("/api/messages?list=1");
      if (!stop) cb(data.conversations || []);
    } catch { /* ignore */ }
    if (!stop) setTimeout(tick, 4000);
  }
  tick();
  return () => { stop = true; };
}

export async function getConversation(convId) {
  const { data } = await api("/api/messages?meta=1&conv=" + encodeURIComponent(convId));
  return data.conversation || null;
}

/** Interroge les messages d'un fil en boucle (retourne une fonction d'arrêt). */
export function watchMessages(convId, cb) {
  let stop = false;
  async function tick() {
    if (stop) return;
    try {
      const { data } = await api("/api/messages?conv=" + encodeURIComponent(convId));
      if (!stop) cb(data.messages || []);
    } catch { /* ignore */ }
    if (!stop) setTimeout(tick, 3000);
  }
  tick();
  return () => { stop = true; };
}

// ---------------------------------------------------------------------------
// Lectures publiques utiles à l'affichage
// ---------------------------------------------------------------------------
export async function getUserPublic(otherUid) {
  const { data } = await api("/api/users?uid=" + encodeURIComponent(otherUid));
  return data.user || { uid: otherUid };
}

// Les dates sont déjà en millisecondes (renvoyées par l'API).
export function ms(ts) {
  if (typeof ts === "number") return ts;
  if (!ts) return 0;
  const n = new Date(ts).getTime();
  return Number.isNaN(n) ? 0 : n;
}
