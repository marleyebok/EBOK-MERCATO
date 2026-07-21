/**
 * Messagerie EBOK-MERCATO (remplace conversations / messages Firestore).
 *   GET  /api/messages?list=1        → mes conversations
 *   GET  /api/messages?conv=X&meta=1 → une conversation
 *   GET  /api/messages?conv=X        → messages d'une conversation
 *   POST /api/messages {action:'start', otherUid, aboutProfileId, aboutTitle}
 *   POST /api/messages {action:'send', convId, text}
 * (Pas de temps réel Firestore : le front interroge périodiquement — polling.)
 */
import { ensureSchema, hasDb, sql, json, readBody, sessionUid } from "./_lib.js";

const ms = (d) => (d ? new Date(d).getTime() : 0);

function convIdFor(a, b, aboutProfileId) {
  const pair = [a, b].sort().join("__");
  return aboutProfileId ? `${pair}__${aboutProfileId}` : pair;
}
const conv = (r) => ({
  id: r.id, participants: r.participants, aboutProfileId: r.about_profile_id || "",
  aboutTitle: r.about_title || "", lastMessage: r.last_message || "",
  lastSenderUid: r.last_sender_uid || "", createdAt: ms(r.created_at), updatedAt: ms(r.updated_at),
});

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  await ensureSchema();
  const uid = await sessionUid(req);
  if (!uid) return json(res, 401, { error: "auth" });

  try {
    if (req.method === "GET") {
      const { list, conv: convParam, meta } = req.query || {};
      if (list) {
        const rows = await sql()`
          SELECT * FROM mercato.conversations
          WHERE ${uid} = ANY(participants) ORDER BY updated_at DESC`;
        return json(res, 200, { conversations: rows.map(conv) });
      }
      if (convParam) {
        const c = await sql()`SELECT * FROM mercato.conversations WHERE id = ${convParam}`;
        if (!c[0] || !c[0].participants.includes(uid)) return json(res, 403, { error: "prive" });
        if (meta) return json(res, 200, { conversation: conv(c[0]) });
        const rows = await sql()`
          SELECT id, sender_uid, text, created_at FROM mercato.messages
          WHERE conv_id = ${convParam} ORDER BY created_at ASC LIMIT 1000`;
        return json(res, 200, {
          messages: rows.map((m) => ({ id: String(m.id), senderUid: m.sender_uid, text: m.text, createdAt: ms(m.created_at) })),
        });
      }
      return json(res, 400, { error: "params" });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (body.action === "start") {
        const other = String(body.otherUid || "");
        if (!other || other === uid) return json(res, 400, { error: "destinataire" });
        const id = convIdFor(uid, other, body.aboutProfileId);
        await sql()`
          INSERT INTO mercato.conversations (id, participants, about_profile_id, about_title)
          VALUES (${id}, ${[uid, other]}, ${body.aboutProfileId || ""}, ${body.aboutTitle || ""})
          ON CONFLICT (id) DO NOTHING`;
        return json(res, 200, { convId: id });
      }
      if (body.action === "send") {
        const convId = String(body.convId || "");
        const text = String(body.text || "").trim();
        if (!convId || !text) return json(res, 400, { error: "message" });
        const c = await sql()`SELECT participants FROM mercato.conversations WHERE id = ${convId}`;
        if (!c[0] || !c[0].participants.includes(uid)) return json(res, 403, { error: "prive" });
        await sql()`INSERT INTO mercato.messages (conv_id, sender_uid, text) VALUES (${convId}, ${uid}, ${text})`;
        await sql()`
          UPDATE mercato.conversations
          SET last_message = ${text.slice(0, 140)}, last_sender_uid = ${uid}, updated_at = now()
          WHERE id = ${convId}`;
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: "action" });
    }

    return json(res, 405, { error: "method" });
  } catch (e) {
    console.error("messages:", e);
    return json(res, 500, { error: "server" });
  }
}
