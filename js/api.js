// js/api.js
// ============================================================
//  Central API helper — all requests go through apiFetch()
//  Cookies are sent automatically (credentials: "include")
// ============================================================

// ── Backend URL — dev uses localhost, production uses Render ──
const API_BASE =
 location.hostname === "localhost"
 ? "http://localhost:5000/api"
 : "https://bakery-backend-v2-c7d2.onrender.com/api";
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
    const res  = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    // Session expired → redirect to login
   if (res.status === 401) {
  return { ok: false, status: 401, success: false };
}

    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
    console.error(`API error (${endpoint}):`, err);
    return { ok: false, success: false, message: "Network error. Is the server running?" };
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
