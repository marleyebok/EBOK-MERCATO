/**
 * Bibliothèque commune des fonctions serverless EBOK-MERCATO (Neon).
 * Remplace l'ancienne couche Firebase : connexion base, schéma, sessions.
 *
 * Base PARTAGÉE de la galaxie (DATABASE_URL) :
 *   shared.users          : identité (uid, email, mot de passe haché, nom)
 *   mercato.accounts      : rôle propre à Mercato (membre | club | agent)
 *   mercato.profiles      : annonces (JSONB `data` = tous les champs du profil)
 *   mercato.conversations : fils de discussion
 *   mercato.messages      : messages d'un fil
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "ebok_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

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
  await q`CREATE SCHEMA IF NOT EXISTS shared`;
  await q`CREATE SCHEMA IF NOT EXISTS mercato`;
  await q`
    CREATE TABLE IF NOT EXISTS shared.users (
      uid TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      display_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await q`
    CREATE TABLE IF NOT EXISTS mercato.accounts (
      uid TEXT PRIMARY KEY REFERENCES shared.users(uid) ON DELETE CASCADE,
      account_type TEXT NOT NULL
    )`;
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
/* Mots de passe & sessions                                            */
/* ------------------------------------------------------------------ */
export function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}
export function checkPassword(pw, hash) {
  return bcrypt.compare(pw, hash || "");
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET manquant");
  return new TextEncoder().encode(s);
}
export async function signSession(uid) {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONE_WEEK}s`)
    .sign(secret());
}
export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

/** Lit le cookie de session et renvoie l'uid connecté (ou null). */
export async function sessionUid(req) {
  const raw = req.headers.cookie || "";
  const m = raw.split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE + "="));
  if (!m) return null;
  return verifySession(decodeURIComponent(m.slice(COOKIE.length + 1)));
}

/** Pose le cookie de session, partagé sur *.ebok.fr en production. */
export function setSessionCookie(req, res, token) {
  const host = String(req.headers.host || "");
  const onEbok = host.endsWith("ebok.fr");
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ONE_WEEK}`,
  ];
  if (onEbok) {
    parts.push("Domain=.ebok.fr");
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}
export function clearSessionCookie(req, res) {
  const host = String(req.headers.host || "");
  const parts = [`${COOKIE}=`, "Path=/", "HttpOnly", "Max-Age=0"];
  if (host.endsWith("ebok.fr")) parts.push("Domain=.ebok.fr");
  res.setHeader("Set-Cookie", parts.join("; "));
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
