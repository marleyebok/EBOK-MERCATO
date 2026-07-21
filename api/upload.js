/**
 * Upload de fichier (photo, CV PDF) → Vercel Blob (remplace Firebase Storage).
 *   POST /api/upload   corps = octets du fichier
 *     en-têtes : x-filename, x-folder, content-type
 * Nécessite un Blob store connecté (variable BLOB_READ_WRITE_TOKEN).
 */
import { put } from "@vercel/blob";
import { hasDb, json, sessionUid } from "./_lib.js";

export const config = { api: { bodyParser: false } };

const MAX = 8 * 1024 * 1024; // 8 Mo

export default async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "db_unavailable" });
  const uid = await sessionUid(req);
  if (!uid) return json(res, 401, { error: "auth" });
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { error: "stockage_indisponible" });

  try {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > MAX) return json(res, 413, { error: "trop_lourd" });
      chunks.push(c);
    }
    const buf = Buffer.concat(chunks);
    if (!buf.length) return json(res, 400, { error: "vide" });

    const folder = String(req.headers["x-folder"] || "divers").replace(/[^a-z0-9_-]/gi, "");
    const name = String(req.headers["x-filename"] || "fichier").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const { url } = await put(`mercato/${uid}/${folder}/${Date.now()}_${name}`, buf, {
      access: "public",
      addRandomSuffix: true,
      contentType: req.headers["content-type"] || "application/octet-stream",
    });
    return json(res, 200, { url });
  } catch (e) {
    console.error("upload:", e);
    return json(res, 500, { error: "server" });
  }
}
