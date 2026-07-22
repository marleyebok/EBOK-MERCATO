/**
 * Infos publiques d'un utilisateur (pour afficher un interlocuteur).
 *   GET /api/users?uid=X
 *
 * Zéro miroir : le nom / e-mail viennent de Clerk, le rôle Mercato de Neon.
 */
import { ensureSchema, hasDb, sql, json, sessionUid, clerkUser } from "./_lib.js";

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  await ensureSchema();
  if (!(await sessionUid(req))) return json(res, 401, { error: "auth" });
  const uid = String((req.query || {}).uid || "");
  if (!uid) return json(res, 400, { error: "uid" });
  try {
    const [rows, info] = await Promise.all([
      sql()`SELECT account_type, display_name FROM mercato.accounts WHERE uid = ${uid}`,
      clerkUser(uid),
    ]);
    const acc = rows[0];
    return json(res, 200, {
      user: {
        uid,
        displayName: (acc && acc.display_name) || info.name || "",
        accountType: acc ? acc.account_type || "" : "",
      },
    });
  } catch (e) {
    console.error("users:", e);
    return json(res, 500, { error: "server" });
  }
}
