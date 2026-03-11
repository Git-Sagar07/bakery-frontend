// js/authHelper.js
// ============================================================
//  Auth helper — uses API cookie-based auth
//  isLoggedIn() is async — safe to call before component.js
//  has resolved initUser(), preventing race-condition redirects
// ============================================================

// NOTE: api.js must be loaded BEFORE this file on every page.

function getUser() {
  return window._currentUser || null;
}

// Async — safe to call even before component.js has run initUser().
// Fetches /auth/me on first call if user not yet cached.
async function isLoggedIn() {
  if (window._currentUser) return true;
  const user = await initUser();
  return user !== null;
}

async function initUser() {
  // Return cache if already resolved (avoid double-fetch)
  if (window._currentUser) return window._currentUser;
  const res = await api.get("/auth/me");
  if (res && res.success) {
    window._currentUser = res.user;
  } else {
    window._currentUser = null;
  }
  return window._currentUser;
}

function logout() {
  api.post("/auth/logout").then(() => {
    window._currentUser = null;
    localStorage.clear();
    window.location.href = "/index.html";
  });
}
