/**
 * Bibliothèque commune des fonctions serverless EBOK-MERCATO (Neon + Clerk).
 *
 * Identité : gérée par CLERK (compte unique de la galaxie EBOK). Les fonctions
 * ci-dessous ne vérifient plus un cookie maison — elles valident le token de
 * session Clerk envoyé par le front (`Authorization: Bearer <token>`).
 *
 * Données (DATABASE_URL, base Neon partagée de la galaxie) :
 *   mercato.accounts      : rôle propre à Mercato (membre | club | agent) + nom
 *                           affiché, indexé par l'ID utilisateur Clerk.
 *   mercato.profiles      : annonces (JSONB `data` = tous les champs du profil)
 *   mercato.conversations : fils de discussion
 *   mercato.messages      : messages d'un fil
 *
 * « Zéro miroir » : aucune copie locale des identités. L'e-mail et le nom réel
 * sont lus à la volée depuis Clerk (voir clerkUser).
 */
import { neon } from "@neondatabase/serverless";
import { verifyToken, createClerkClient } from "@clerk/backend";

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}
export function sql() {
  return neon(process.env.DATABASE_URL);
}

/* ------------------------------------------------------------------ */
/* Schéma (créé automatiquement au premier appel)                      */
/* ------------------------------------------------------------------ */
let ready = false;
export async function ensureSchema() {
  if (ready) return;
  const q = sql();
  await q`CREATE SCHEMA IF NOT EXISTS mercato`;
  await q`
    CREATE TABLE IF NOT EXISTS mercato.accounts (
      uid TEXT PRIMARY KEY,
      account_type TEXT NOT NULL,
      display_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  // Compat : anciennes installations (auth maison Firebase/Neon). L'uid est
  // désormais l'ID Clerk : on relâche le lien vers shared.users et on s'assure
  // que la colonne display_name existe.
  await q`ALTER TABLE mercato.accounts DROP CONSTRAINT IF EXISTS accounts_uid_fkey`;
  await q`ALTER TABLE mercato.accounts ADD COLUMN IF NOT EXISTS display_name TEXT`;
  await q`
    CREATE TABLE IF NOT EXISTS mercato.profiles (
      id TEXT PRIMARY KEY,
      owner_uid TEXT NOT NULL,
      kind TEXT,
      published BOOLEAN NOT NULL DEFAULT false,
      agent_managed BOOLEAN NOT NULL DEFAULT false,
      region TEXT,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await q`
    CREATE TABLE IF NOT EXISTS mercato.conversations (
      id TEXT PRIMARY KEY,
      participants TEXT[] NOT NULL,
      about_profile_id TEXT,
      about_title TEXT,
      last_message TEXT DEFAULT '',
      last_sender_uid TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await q`
    CREATE TABLE IF NOT EXISTS mercato.messages (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      conv_id TEXT NOT NULL,
      sender_uid TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  ready = true;
}

/* ------------------------------------------------------------------ */
/* Sessions & identité — CLERK                                         */
/* ------------------------------------------------------------------ */
let _clerk = null;
function clerk() {
  if (!_clerk) _clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  return _clerk;
}

/** Récupère le token de session : en-tête Bearer, sinon cookie __session. */
function bearerToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const raw = req.headers.cookie || "";
  const m = raw.split(";").map((c) => c.trim()).find((c) => c.startsWith("__session="));
  return m ? decodeURIComponent(m.slice("__session=".length)) : null;
}

/** Valide le token Clerk et renvoie l'ID utilisateur (le `sub`), ou null. */
export async function sessionUid(req) {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Infos d'identité lues à la volée depuis Clerk (zéro miroir). */
export async function clerkUser(uid) {
  try {
    const u = await clerk().users.getUser(uid);
    const emails = u.emailAddresses || [];
    const primary = emails.find((e) => e.id === u.primaryEmailAddressId) || emails[0];
    const email = primary?.emailAddress || "";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "";
    return { email, name };
  } catch {
    return { email: "", name: "" };
  }
}

/* ------------------------------------------------------------------ */
/* Aides requête / réponse                                             */
/* ------------------------------------------------------------------ */
export function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}
export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
export function newId() {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}
