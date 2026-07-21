/**
 * Profils / annonces EBOK-MERCATO (remplace la collection Firestore `profiles`).
 *   GET  /api/profiles              → annonces publiées
 *   GET  /api/profiles?id=X         → une annonce (publiée, ou la sienne)
 *   GET  /api/profiles?mine=1       → mon profil personnel
 *   GET  /api/profiles?managed=1    → mes joueurs gérés (agent)
 *   GET  /api/profiles?managed=1&id=X → un joueur géré
 *   POST /api/profiles {managed?, id?, ...payload} → enregistrer
 *   DELETE /api/profiles?id=X       → supprimer un joueur géré
 */
import { ensureSchema, hasDb, sql, json, readBody, newId, sessionUid } from "./_lib.js";

const ms = (d) => (d ? new Date(d).getTime() : 0);

/** Reconstitue l'objet attendu par le front (mêmes champs qu'avant). */
function toProfile(row) {
  return {
    id: row.id,
    ...row.data,
    ownerUid: row.owner_uid,
    kind: row.kind,
    published: row.published,
    agentManaged: row.agent_managed,
    region: row.region,
    createdAt: ms(row.created_at),
    updatedAt: ms(row.updated_at),
  };
}

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  await ensureSchema();
  const uid = await sessionUid(req);
  const { id, mine, managed } = req.query || {};

  try {
    if (req.method === "GET") {
      if (mine) {
        if (!uid) return json(res, 401, { error: "auth" });
        const rows = await sql()`SELECT * FROM mercato.profiles WHERE id = ${uid}`;
        return json(res, 200, { profile: rows[0] ? toProfile(rows[0]) : null });
      }
      if (managed) {
        if (!uid) return json(res, 401, { error: "auth" });
        if (id) {
          const rows = await sql()`SELECT * FROM mercato.profiles WHERE id = ${id} AND owner_uid = ${uid}`;
          return json(res, 200, { profile: rows[0] ? toProfile(rows[0]) : null });
        }
        const rows = await sql()`
          SELECT * FROM mercato.profiles
          WHERE owner_uid = ${uid} AND agent_managed = true
          ORDER BY updated_at DESC`;
        return json(res, 200, { profiles: rows.map(toProfile) });
      }
      if (id) {
        const rows = await sql()`SELECT * FROM mercato.profiles WHERE id = ${id}`;
        const row = rows[0];
        if (!row) return json(res, 404, { error: "introuvable" });
        if (!row.published && row.owner_uid !== uid) return json(res, 403, { error: "prive" });
        return json(res, 200, { profile: toProfile(row) });
      }
      // Liste publique
      const rows = await sql()`
        SELECT * FROM mercato.profiles WHERE published = true ORDER BY updated_at DESC LIMIT 500`;
      return json(res, 200, { profiles: rows.map(toProfile) });
    }

    if (req.method === "POST") {
      if (!uid) return json(res, 401, { error: "auth" });
      const body = await readBody(req);
      const isManaged = Boolean(body.managed);
      const data = { ...body };
      delete data.managed;
      delete data.id;

      const kind = isManaged ? (data.kind || "joueur") : (data.kind || null);
      const published = data.published !== false;
      const region = data.region || null;

      if (isManaged) {
        const pid = body.id || newId();
        const owns = body.id
          ? await sql()`SELECT 1 FROM mercato.profiles WHERE id = ${pid} AND owner_uid = ${uid}`
          : [{ ok: 1 }];
        if (body.id && !owns[0]) return json(res, 403, { error: "prive" });
        await sql()`
          INSERT INTO mercato.profiles (id, owner_uid, kind, published, agent_managed, region, data, updated_at)
          VALUES (${pid}, ${uid}, ${kind}, ${published}, true, ${region}, ${JSON.stringify(data)}::jsonb, now())
          ON CONFLICT (id) DO UPDATE SET
            kind = EXCLUDED.kind, published = EXCLUDED.published, region = EXCLUDED.region,
            data = EXCLUDED.data, updated_at = now()`;
        const rows = await sql()`SELECT * FROM mercato.profiles WHERE id = ${pid}`;
        return json(res, 200, { profile: toProfile(rows[0]) });
      }

      // Profil personnel : id = uid
      await sql()`
        INSERT INTO mercato.profiles (id, owner_uid, kind, published, agent_managed, region, data, updated_at)
        VALUES (${uid}, ${uid}, ${kind}, ${published}, false, ${region}, ${JSON.stringify(data)}::jsonb, now())
        ON CONFLICT (id) DO UPDATE SET
          kind = EXCLUDED.kind, published = EXCLUDED.published, region = EXCLUDED.region,
          data = EXCLUDED.data, updated_at = now()`;
      const rows = await sql()`SELECT * FROM mercato.profiles WHERE id = ${uid}`;
      return json(res, 200, { profile: toProfile(rows[0]) });
    }

    if (req.method === "DELETE") {
      if (!uid) return json(res, 401, { error: "auth" });
      if (!id) return json(res, 400, { error: "id" });
      await sql()`DELETE FROM mercato.profiles WHERE id = ${id} AND owner_uid = ${uid} AND agent_managed = true`;
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "method" });
  } catch (e) {
    console.error("profiles:", e);
    return json(res, 500, { error: "server" });
  }
}
