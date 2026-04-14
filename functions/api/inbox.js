// ============================================================
//  Tween 82.8 — Inbox API (Cloudflare Pages Function + D1)
//
//  D1 binding: GUESTBOOK_DB (same DB as guestbook)
//
//  GET  /api/inbox              → list messages (newest first, limit 50)
//  GET  /api/inbox?id=123       → get single message body (admin only)
//  POST /api/inbox              → create message { name, subject, body }
//  PATCH /api/inbox              → mark as read { id } (admin only)
//
//  Admin auth: Authorization header must match env.INBOX_TOKEN
//
//  Setup: run this SQL in D1 console:
//    CREATE TABLE IF NOT EXISTS inbox (
//      id      INTEGER PRIMARY KEY AUTOINCREMENT,
//      name    TEXT    NOT NULL DEFAULT '名無しリスナー',
//      subject TEXT    NOT NULL,
//      body    TEXT    NOT NULL,
//      unread  INTEGER NOT NULL DEFAULT 1,
//      ts      TEXT    NOT NULL DEFAULT (datetime('now'))
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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(request) },
  });
}

function isAdmin(context) {
  const token = context.env.INBOX_TOKEN;
  if (!token) return false;
  const auth = context.request.headers.get("Authorization") || "";
  return auth === `Bearer ${token}`;
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context.request) });
}

// GET — list (public: id, name, subject, unread, ts) or single body (admin)
export async function onRequestGet(context) {
  const db = context.env.GUESTBOOK_DB;
  if (!db) return json({ error: "DB not configured" }, 503, context.request);

  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");

  try {
    // Single message body — admin only
    if (id) {
      if (!isAdmin(context)) {
        return json({ error: "Unauthorized" }, 401, context.request);
      }
      const { results } = await db
        .prepare("SELECT id, name, subject, body, email, unread, ts FROM inbox WHERE id = ?")
        .bind(Number(id))
        .all();
      if (!results.length) return json({ error: "Not found" }, 404, context.request);
      return json(results[0], 200, context.request);
    }

    // List — public (no body)
    const { results } = await db
      .prepare("SELECT id, name, subject, unread, ts FROM inbox ORDER BY id DESC LIMIT 50")
      .all();
    return json(results, 200, context.request);
  } catch (e) {
    return json({ error: e.message }, 500, context.request);
  }
}

// POST — send a new message (public)
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
  const subject = (body.subject || "").trim().slice(0, 100);
  const msg = (body.body || "").trim().slice(0, 1000);
  const email = (body.email || "").trim().slice(0, 100);

  if (!subject) return json({ error: "Subject required" }, 400, context.request);
  if (!msg) return json({ error: "Message required" }, 400, context.request);

  try {
    // Store timestamp in JST (UTC+9)
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const ts = jst.toISOString().replace("T", " ").slice(0, 19);

    const result = await db
      .prepare("INSERT INTO inbox (name, subject, body, email, ts) VALUES (?, ?, ?, ?, ?)")
      .bind(name, subject, msg, email, ts)
      .run();

    return json({ id: result.meta.last_row_id, name, subject }, 201, context.request);
  } catch (e) {
    return json({ error: e.message }, 500, context.request);
  }
}

// PATCH — mark as read (admin only)
export async function onRequestPatch(context) {
  const db = context.env.GUESTBOOK_DB;
  if (!db) return json({ error: "DB not configured" }, 503, context.request);

  if (!isAdmin(context)) {
    return json({ error: "Unauthorized" }, 401, context.request);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, context.request);
  }

  const id = body.id;
  if (!id) return json({ error: "id required" }, 400, context.request);

  try {
    await db
      .prepare("UPDATE inbox SET unread = 0 WHERE id = ?")
      .bind(Number(id))
      .run();
    return json({ ok: true }, 200, context.request);
  } catch (e) {
    return json({ error: e.message }, 500, context.request);
  }
}
