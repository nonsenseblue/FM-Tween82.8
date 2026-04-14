// ============================================================
//  Tween 82.8 — Cloudflare Worker
//  YouTube search proxy + KV cache (shared across all users)
// ============================================================
//
//  Environment variables (set via `wrangler secret put`):
//    YT_API_KEYS  — comma-separated YouTube Data API keys
//                   e.g. "key1,key2,key3"
//
//  KV binding (set in wrangler.toml):
//    TWEEN_CACHE  — KV namespace for search result cache
// ============================================================

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours (was 7 days — music results change daily)
const MAX_RESULTS       = 20;
const ALLOWED_ORIGINS   = [
  "https://tween828.app",
  "https://tween828.pages.dev",
  "http://localhost",
  "http://127.0.0.1",
  "null", // file:// protocol sends "null" as origin
];

function corsHeaders(origin) {
  const allowed = !origin
    || ALLOWED_ORIGINS.includes(origin)
    || origin?.endsWith(".tween828.app")
    || origin?.endsWith(".tween828.pages.dev")
    || origin?.startsWith("http://localhost:")
    || origin?.startsWith("http://127.0.0.1:")
    || origin?.endsWith(".test.local")
    || origin?.includes(".test.local:")
    || origin?.endsWith(".test")
    || origin?.includes(".test:");
  const allowedOrigin = allowed ? (origin || "*") : "https://tween828.app";
  return {
    "Access-Control-Allow-Origin":  allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url   = new URL(request.url);
    const genre = (url.searchParams.get("genre") || "").trim();
    const q     = (url.searchParams.get("q")     || "").trim();

    if (!genre || !q) {
      return new Response(JSON.stringify({ error: "Missing genre or q" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const cacheKey = `genre_${genre}`;

    // ── Check KV cache ──────────────────────────────────────
    try {
      const cached = await env.TWEEN_CACHE.get(cacheKey, { type: "json" });
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
            "X-Cache": "HIT",
            ...corsHeaders(origin),
          },
        });
      }
    } catch { /* KV read failed — proceed to API */ }

    // ── Fetch from YouTube API (with per-key retry) ─────────
    const keys = (env.YT_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
    if (!keys.length) {
      return new Response(JSON.stringify({ error: "Service unavailable — no API keys configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    let items = null;
    for (const key of keys) {
      try {
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(q)}&key=${key}`;
        const res   = await fetch(ytUrl);

        // Quota exceeded or rate limited → try next key
        if (res.status === 403 || res.status === 429) continue;

        if (!res.ok) continue; // other errors → try next key

        const json = await res.json();
        const found = (json.items || []).filter(it => it.id?.videoId);
        if (found.length) { items = found; break; }
        // empty results → try next key (different query interpretation)
      } catch { continue; /* network/parse error → try next key */ }
    }

    if (!items || !items.length) {
      const allQuotaExhausted = true; // all keys tried
      return new Response(JSON.stringify({
        error: allQuotaExhausted
          ? "クォータ制限に達しました。しばらく後にお試しください。"
          : "このジャンルの動画が見つかりませんでした。"
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // ── Save to KV (24h TTL) ────────────────────────────────
    try {
      await env.TWEEN_CACHE.put(cacheKey, JSON.stringify(items), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch { /* KV write failed — still return results to user */ }

    return new Response(JSON.stringify(items), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=3600`,
        "X-Cache": "MISS",
        ...corsHeaders(origin),
      },
    });
  },
};
