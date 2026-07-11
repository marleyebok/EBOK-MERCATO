/**
 * Stockage ultra-simple sur fichier JSON.
 * Pas de base de données à installer : tout tient dans data/db.json.
 * Suffisant pour un MVP ; on pourra migrer vers une vraie base plus tard.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], profiles: [] }, null, 2));
  }
}

function read() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: [], profiles: [] };
  }
}

function write(db) {
  ensureFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function id() {
  return crypto.randomUUID();
}

// ---- Utilisateurs ----
function findUserByEmail(email) {
  const db = read();
  return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserById(userId) {
  const db = read();
  return db.users.find((u) => u.id === userId);
}

function createUser({ email, passwordHash, accountType }) {
  const db = read();
  const user = {
    id: id(),
    email,
    passwordHash,
    accountType, // "membre" (joueur/coach) | "club"
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  write(db);
  return user;
}

// ---- Profils / Annonces ----
function getProfileByUserId(userId) {
  const db = read();
  return db.profiles.find((p) => p.userId === userId) || null;
}

function getProfileById(profileId) {
  const db = read();
  return db.profiles.find((p) => p.id === profileId) || null;
}

function upsertProfile(userId, data) {
  const db = read();
  const now = new Date().toISOString();
  let profile = db.profiles.find((p) => p.userId === userId);
  if (profile) {
    Object.assign(profile, data, { updatedAt: now });
  } else {
    profile = {
      id: id(),
      userId,
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    db.profiles.push(profile);
  }
  write(db);
  return profile;
}

function listProfiles() {
  const db = read();
  // Du plus récent au plus ancien (par date de mise à jour / création).
  return [...db.profiles].sort((a, b) => {
    const da = new Date(a.updatedAt || a.createdAt).getTime();
    const dbb = new Date(b.updatedAt || b.createdAt).getTime();
    return dbb - da;
  });
}

module.exports = {
  read,
  write,
  id,
  findUserByEmail,
  findUserById,
  createUser,
  getProfileByUserId,
  getProfileById,
  upsertProfile,
  listProfiles,
};
