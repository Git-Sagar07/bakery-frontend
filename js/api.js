// js/api.js
// ============================================================
//  Central API helper — all requests go through apiFetch()
//  Cookies are sent automatically (credentials: "include")
// ============================================================

// ── Backend URL ──────────────────────────────────────────────
const RENDER_API  = "https://bakery-backend-v2-c7d2.onrender.com/api";
const LOCAL_API   = "http://localhost:5000/api";
const IS_LOCAL    = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// On localhost: try local backend first, fall back to Render if refused
// On Netlify / any other host: always use Render
let API_BASE = IS_LOCAL ? LOCAL_API : RENDER_API;

// Wake up Render backend (free tier sleeps after inactivity)
// Silent ping — errors are intentionally swallowed
(function wakeBackend() {
  fetch(RENDER_API.replace("/api", ""), { method: "GET", mode: "no-cors" })
    .catch(() => {});
})();
// ─────────────────────────────────────────────────────────────

// ── Core fetch wrapper ────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const config = {
    credentials: "include",         // send httpOnly cookie with every request
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  try {
    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, config);
    } catch (connErr) {
      // Local backend refused connection — silently fall back to Render
      if (IS_LOCAL && API_BASE === LOCAL_API) {
        API_BASE = RENDER_API;
        res = await fetch(`${API_BASE}${endpoint}`, config);
      } else {
        throw connErr;
      }
    }

    const data = await res.json();

    // 401 — pass server message through (wrong password, etc.)
    // Only redirect for non-auth endpoints (not login/signup which expect 401 on bad creds)
    if (res.status === 401) {
      const isAuthEndpoint = endpoint.includes("/auth/login") || endpoint.includes("/auth/signup");
      if (!isAuthEndpoint) {
        return { ok: false, status: 401, success: false, message: data?.message || "Session expired." };
      }
    }

    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
    console.error(`API error (${endpoint}):`, err);
    return { ok: false, success: false, message: "Network error. Check your connection." };
  }
}

// ── Convenience methods ──────────────────────────────────────
const api = {
  get:    (url)       => apiFetch(url, { method: "GET" }),
  post:   (url, body) => apiFetch(url, { method: "POST",   body }),
  put:    (url, body) => apiFetch(url, { method: "PUT",    body }),
  patch:  (url, body) => apiFetch(url, { method: "PATCH",  body }),
  delete: (url, body) => apiFetch(url, { method: "DELETE", body }),
};

// ── Global notification (used by api.js itself) ───────────────
function showNotificationGlobal(message) {
  let n = document.querySelector(".notification");
  if (!n) {
    n = document.createElement("div");
    n.className = "notification";
    document.body.appendChild(n);
  }
  n.textContent = message;
  setTimeout(() => n.classList.add("show"), 50);
  setTimeout(() => {
    n.classList.remove("show");
    setTimeout(() => n.remove(), 300);
  }, 3000);
}
