/**
 * Authentification EBOK-MERCATO sur Neon (remplace Firebase Auth).
 *   GET  /api/auth              → session courante
 *   POST /api/auth {action}     → register | login | logout
 */
import {
  ensureSchema, hasDb, sql, json, readBody, newId,
  hashPassword, checkPassword, signSession, sessionUid,
  setSessionCookie, clearSessionCookie,
} from "./_lib.js";

const ACCOUNT_TYPES = ["membre", "club", "agent"];

async function loadUser(uid) {
  const rows = await sql()`
    SELECT u.uid, u.email, u.display_name, a.account_type
    FROM shared.users u
    LEFT JOIN mercato.accounts a ON a.uid = u.uid
    WHERE u.uid = ${uid}`;
  if (!rows[0]) return null;
  const r = rows[0];
  return { uid: r.uid, email: r.email, displayName: r.display_name || "", accountType: r.account_type || "membre" };
}

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  try {
    await ensureSchema();
  } catch (e) {
    console.error("schema:", e);
    return json(res, 500, { error: "schema" });
  }

  if (req.method === "GET") {
    const uid = await sessionUid(req);
    if (!uid) return json(res, 200, { configured: true, user: null });
    return json(res, 200, { configured: true, user: await loadUser(uid) });
  }

  if (req.method !== "POST") return json(res, 405, { error: "method" });

  const body = await readBody(req);
  const action = String(body.action || "");

  if (action === "logout") {
    clearSessionCookie(req, res);
    return json(res, 200, { ok: true });
  }

  if (action === "register") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const accountType = ACCOUNT_TYPES.includes(body.accountType) ? body.accountType : "membre";
    const displayName = String(body.displayName || "").trim().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 422, { error: "email" });
    if (password.length < 6) return json(res, 422, { error: "password_court" });

    const exists = await sql()`SELECT 1 FROM shared.users WHERE email = ${email}`;
    if (exists[0]) return json(res, 409, { error: "email_pris" });

    const uid = newId();
    const hash = await hashPassword(password);
    await sql()`INSERT INTO shared.users (uid, email, password_hash, display_name)
                VALUES (${uid}, ${email}, ${hash}, ${displayName})`;
    await sql()`INSERT INTO mercato.accounts (uid, account_type) VALUES (${uid}, ${accountType})`;
    setSessionCookie(req, res, await signSession(uid));
    return json(res, 200, { user: await loadUser(uid) });
  }

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rows = await sql()`SELECT uid, password_hash FROM shared.users WHERE email = ${email}`;
    if (!rows[0] || !(await checkPassword(password, rows[0].password_hash))) {
      return json(res, 401, { error: "identifiants" });
    }
    setSessionCookie(req, res, await signSession(rows[0].uid));
    return json(res, 200, { user: await loadUser(rows[0].uid) });
  }

  return json(res, 400, { error: "action" });
}
