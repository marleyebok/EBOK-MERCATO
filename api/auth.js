/**
 * Session & onboarding EBOK-MERCATO (identité déléguée à Clerk).
 *
 * L'inscription / la connexion / la déconnexion sont gérées par Clerk côté
 * client. Cet endpoint sert uniquement à :
 *   GET  /api/auth               → session courante (identité Clerk + rôle Mercato)
 *   POST /api/auth {action:onboard, accountType, displayName}
 *                                → crée/complète le compte Mercato (rôle + nom)
 */
import { ensureSchema, hasDb, sql, json, readBody, sessionUid, clerkUser } from "./_lib.js";

const ACCOUNT_TYPES = ["membre", "club", "agent"];

/** Assemble l'utilisateur vu par le front : identité Clerk + rôle Mercato. */
async function loadUser(uid) {
  const [rows, info] = await Promise.all([
    sql()`SELECT account_type, display_name FROM mercato.accounts WHERE uid = ${uid}`,
    clerkUser(uid),
  ]);
  const acc = rows[0];
  return {
    uid,
    email: info.email,
    // Nom du club / de l'agence si renseigné, sinon le nom réel (Clerk).
    displayName: (acc && acc.display_name) || info.name || "",
    accountType: acc ? acc.account_type : null, // null = compte pas encore finalisé
  };
}

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  try {
    await ensureSchema();
  } catch (e) {
    console.error("schema:", e);
    return json(res, 500, { error: "schema" });
  }

  const uid = await sessionUid(req);

  if (req.method === "GET") {
    if (!uid) return json(res, 200, { configured: true, user: null });
    return json(res, 200, { configured: true, user: await loadUser(uid) });
  }

  if (req.method !== "POST") return json(res, 405, { error: "method" });
  if (!uid) return json(res, 401, { error: "auth" });

  const body = await readBody(req);
  const action = String(body.action || "");

  if (action === "onboard") {
    const accountType = ACCOUNT_TYPES.includes(body.accountType) ? body.accountType : "membre";
    const displayName = String(body.displayName || "").trim().slice(0, 120);
    await sql()`
      INSERT INTO mercato.accounts (uid, account_type, display_name)
      VALUES (${uid}, ${accountType}, ${displayName})
      ON CONFLICT (uid) DO UPDATE SET
        account_type = EXCLUDED.account_type,
        display_name = EXCLUDED.display_name`;
    return json(res, 200, { user: await loadUser(uid) });
  }

  return json(res, 400, { error: "action" });
}
