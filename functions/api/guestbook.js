// ============================================================
//  Tween 82.8 — Guestbook API (Cloudflare Pages Function + D1)
//
//  D1 binding: GUESTBOOK_DB
//
//  GET  /api/guestbook         → list messages (newest first, limit 50)
//  POST /api/guestbook         → create message { name, msg }
//
//  Setup: run this SQL in D1 console:
//    CREATE TABLE IF NOT EXISTS messages (
//      id    INTEGER PRIMARY KEY AUTOINCREMENT,
//      name  TEXT    NOT NULL DEFAULT '名無しリスナー',
//      msg   TEXT    NOT NULL,
//      ts    TEXT    NOT NULL DEFAULT (datetime('now'))
//    );
// ============================================================

const ALLOWED_ORIGINS = [
  "https://tween828.app",
  "https://tween828.pages.dev",
  "http://localhost",
  "http://127.0.0.1",
];

function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".tween828.pages.dev") ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");
  return allowed ? origin : "https://tween828.app";
}

function cors(request) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(request) },
  });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context.request) });
}

export async function onRequestGet(context) {
  const db = context.env.GUESTBOOK_DB;
  if (!db) return json({ error: "DB not configured" }, 503, context.request);

  try {
    const { results } = await db
      .prepare("SELECT id, name, msg, ts FROM messages ORDER BY id DESC LIMIT 50")
      .all();
    return json(results, 200, context.request);
  } catch (e) {
    return json({ error: e.message }, 500, context.request);
  }
}

export async function onRequestPost(context) {
  const db = context.env.GUESTBOOK_DB;
  if (!db) return json({ error: "DB not configured" }, 503, context.request);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, context.request);
  }

  const name = (body.name || "").trim().slice(0, 20) || "名無しリスナー";
  const msg = (body.msg || "").trim().slice(0, 200);
  if (!msg) return json({ error: "Message required" }, 400, context.request);

  try {
    // Store timestamp in JST (UTC+9)
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const ts = jst.toISOString().replace("T", " ").slice(0, 19);

    const result = await db
      .prepare("INSERT INTO messages (name, msg, ts) VALUES (?, ?, ?)")
      .bind(name, msg, ts)
      .run();

    // Return the created message
    const { results } = await db
      .prepare("SELECT id, name, msg, ts FROM messages WHERE id = ?")
      .bind(result.meta.last_row_id)
      .all();

    return json(results[0] || { id: result.meta.last_row_id, name, msg }, 201, context.request);
  } catch (e) {
    return json({ error: e.message }, 500, context.request);
  }
}
