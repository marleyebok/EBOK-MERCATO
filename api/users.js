/**
 * Infos publiques d'un utilisateur (pour afficher un interlocuteur).
 *   GET /api/users?uid=X
 */
import { ensureSchema, hasDb, sql, json, sessionUid } from "./_lib.js";

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  await ensureSchema();
  if (!(await sessionUid(req))) return json(res, 401, { error: "auth" });
  const uid = String((req.query || {}).uid || "");
  if (!uid) return json(res, 400, { error: "uid" });
  try {
    const rows = await sql()`
      SELECT u.uid, u.display_name, a.account_type
      FROM shared.users u LEFT JOIN mercato.accounts a ON a.uid = u.uid
      WHERE u.uid = ${uid}`;
    const r = rows[0];
    return json(res, 200, {
      user: r
        ? { uid: r.uid, displayName: r.display_name || "", accountType: r.account_type || "" }
        : { uid },
    });
  } catch (e) {
    console.error("users:", e);
    return json(res, 500, { error: "server" });
  }
}
