/**
 * Couche de données EBOK-MERCATO sur Firebase (Auth + Firestore + Storage).
 * Tout est côté client ; la sécurité est assurée par firestore.rules / storage.rules.
 *
 * Collections Firestore :
 *   users/{uid}         : { email, accountType: 'membre'|'club'|'agent', displayName, createdAt }
 *   profiles/{id}       : annonce (joueur/coach/club). id = uid pour un profil personnel ;
 *                         id auto pour un joueur géré par un agent (agentManaged: true).
 *   conversations/{id}  : { participants:[uid,uid], aboutProfileId, aboutTitle,
 *                           lastMessage, lastSenderUid, updatedAt, createdAt }
 *     messages/{id}     : { senderUid, text, createdAt }
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { firebaseConfig, isConfigured } from './firebase-config.js';

let app, auth, db, storage;

export function initFirebase() {
  if (!isConfigured()) return false;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return true;
}

export { isConfigured };
export const uid = () => auth && auth.currentUser && auth.currentUser.uid;

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------
export async function register({ email, password, accountType, displayName }) {
  initFirebase();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    accountType, // 'membre' | 'club' | 'agent'
    displayName: displayName || '',
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export async function login({ email, password }) {
  initFirebase();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  initFirebase();
  await signOut(auth);
}

// Renvoie la session courante (résolue après le 1er état d'auth).
export function getSessionOnce() {
  return new Promise((resolve) => {
    if (!initFirebase()) return resolve({ configured: false, user: null });
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsub();
      if (!u) return resolve({ configured: true, user: null });
      let data = {};
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) data = snap.data();
      } catch (e) { /* ignore */ }
      resolve({ configured: true, user: { uid: u.uid, email: u.email, ...data } });
    });
  });
}

// ---------------------------------------------------------------------------
// Profils / annonces
// ---------------------------------------------------------------------------
export async function getMyProfile() {
  initFirebase();
  const snap = await getDoc(doc(db, 'profiles', uid()));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Profil personnel (membre / club) : doc dont l'id = uid.
export async function saveMyProfile(data) {
  initFirebase();
  const refd = doc(db, 'profiles', uid());
  const snap = await getDoc(refd);
  const payload = {
    ...data,
    ownerUid: uid(),
    agentManaged: false,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) payload.createdAt = serverTimestamp();
  await setDoc(refd, payload, { merge: true });
  return { id: uid(), ...payload };
}

export async function getAnnonce(id) {
  initFirebase();
  const snap = await getDoc(doc(db, 'profiles', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Toutes les annonces publiées (tri client-side, pas d'index composite requis).
export async function listAnnonces() {
  initFirebase();
  const q = query(collection(db, 'profiles'), where('published', '==', true));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
  return items;
}

// ---------------------------------------------------------------------------
// Agent : gestion de plusieurs joueurs
// ---------------------------------------------------------------------------
export async function listManagedProfiles() {
  initFirebase();
  const q = query(collection(db, 'profiles'), where('ownerUid', '==', uid()));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.agentManaged)
    .sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
}

export async function getManagedProfile(id) {
  initFirebase();
  const snap = await getDoc(doc(db, 'profiles', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function saveManagedProfile(id, data) {
  initFirebase();
  const payload = { ...data, ownerUid: uid(), agentManaged: true, kind: data.kind || 'joueur', updatedAt: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, 'profiles', id), payload, { merge: true });
    return { id, ...payload };
  }
  payload.createdAt = serverTimestamp();
  const refd = await addDoc(collection(db, 'profiles'), payload);
  return { id: refd.id, ...payload };
}

export async function deleteManagedProfile(id) {
  initFirebase();
  await deleteDoc(doc(db, 'profiles', id));
}

// ---------------------------------------------------------------------------
// Fichiers (photos, PDF) → Firebase Storage
// ---------------------------------------------------------------------------
export async function uploadFile(file, folder = 'divers') {
  initFirebase();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${uid()}/${folder}/${Date.now()}_${safe}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

// ---------------------------------------------------------------------------
// Messagerie
// ---------------------------------------------------------------------------
export function conversationId(otherUid, aboutProfileId) {
  const pair = [uid(), otherUid].sort().join('__');
  return aboutProfileId ? `${pair}__${aboutProfileId}` : pair;
}

// Démarre (ou récupère) une conversation avec le propriétaire d'une annonce.
export async function startConversation(otherUid, aboutProfileId, aboutTitle) {
  initFirebase();
  const convId = conversationId(otherUid, aboutProfileId);
  const refd = doc(db, 'conversations', convId);
  const snap = await getDoc(refd);
  if (!snap.exists()) {
    await setDoc(refd, {
      participants: [uid(), otherUid],
      aboutProfileId: aboutProfileId || '',
      aboutTitle: aboutTitle || '',
      lastMessage: '',
      lastSenderUid: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return convId;
}

export async function sendMessage(convId, text) {
  initFirebase();
  const clean = (text || '').trim();
  if (!clean) return;
  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    senderUid: uid(),
    text: clean,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'conversations', convId), {
    lastMessage: clean.slice(0, 140),
    lastSenderUid: uid(),
    updatedAt: serverTimestamp(),
  });
}

export function watchConversations(cb) {
  initFirebase();
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid()));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
    cb(items);
  });
}

export async function getConversation(convId) {
  initFirebase();
  const snap = await getDoc(doc(db, 'conversations', convId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function watchMessages(convId, cb) {
  initFirebase();
  const q = query(collection(db, 'conversations', convId, 'messages'), orderBy('createdAt'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// ---------------------------------------------------------------------------
// Lectures publiques utiles à l'affichage
// ---------------------------------------------------------------------------
export async function getUserPublic(otherUid) {
  initFirebase();
  const snap = await getDoc(doc(db, 'users', otherUid));
  return snap.exists() ? { uid: otherUid, ...snap.data() } : { uid: otherUid };
}

// Convertit un Timestamp Firestore (ou null) en millisecondes.
function ms(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
}
export { ms };
