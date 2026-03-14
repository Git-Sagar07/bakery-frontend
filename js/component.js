// js/component.js
// ============================================================
//  Loads navbar + footer, initialises user session from API
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Component paths use absolute roots so they work from / and /pages/
  await loadComponent("navbar", "/components/navbar.html", "navbar-container");
  await loadComponent("footer", "/components/footer.html", "footer-container");

  // Bootstrap user session from API (one request, cached in window._currentUser)
  await initUser();

  // Now update navbar with logged-in state
  updateNavbar();
  highlightActiveLink();
  updateNavCartCount();
});

async function loadComponent(name, file, containerId) {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    const res  = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load ${name}`);
    container.innerHTML = await res.text();

    if (name === "navbar") {
      updateNavbar();
      highlightActiveLink();
      initHamburger();
    }
  } catch (err) {
    console.error(`Error loading ${name}:`, err);
  }
}

// ── Update navbar auth state ──────────────────────────────────
function updateNavbar() {
  const authLinks = document.getElementById("auth-links");
  const userInfo  = document.getElementById("user-info");
  if (!authLinks || !userInfo) return;

  const user = getUser();

  if (user) {
    authLinks.style.display = "none";
    userInfo.style.display  = "flex";
    userInfo.innerHTML = `
      <a href="/pages/profile.html" class="btn-solid">👤 ${user.name.split(" ")[0]}</a>
      <button onclick="logout()" id="logoutLink">Logout</button>
    `;
  } else {
    authLinks.style.display = "flex";
    userInfo.style.display  = "none";
  }

  updateNavCartCount();
}

// ── Cart badge ────────────────────────────────────────────────
async function updateNavCartCount() {
  const badge = document.getElementById("nav-cart-badge");
  if (!badge) return;

  if (!isLoggedIn()) { badge.style.display = "none"; return; }

  try {
    const res = await api.get("/cart");
    if (res && res.success) {
      const total = res.cart.reduce((s, i) => s + i.quantity, 0);
      badge.textContent   = total;
      badge.style.display = total > 0 ? "inline-flex" : "none";
    }
  } catch {
    badge.style.display = "none";
  }
}

// ── Active link highlight ────────────────────────────────────
function highlightActiveLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-menu a").forEach(link => {
    if (link.getAttribute("href").split("/").pop() === currentPage) {
      link.classList.add("active-link");
    }
  });
}

// ── Hamburger mobile menu ─────────────────────────────────────
function initHamburger() {
  const hamburger = document.getElementById("navHamburger");
  const menu      = document.getElementById("navMenu");
  if (!hamburger || !menu) return;

  // Toggle open/close on hamburger click
  hamburger.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = menu.classList.toggle("open");
    hamburger.classList.toggle("open", isOpen);

    // Inject auth links into mobile dropdown
    const mobileAuth = document.getElementById("navMobileAuth");
    const authLinks  = document.getElementById("auth-links");
    const userInfo   = document.getElementById("user-info");
    if (mobileAuth) {
      if (isOpen) {
        if (userInfo && userInfo.innerHTML.trim()) {
          mobileAuth.innerHTML = userInfo.innerHTML;
        } else if (authLinks && authLinks.innerHTML.trim()) {
          mobileAuth.innerHTML = authLinks.innerHTML;
        }
        mobileAuth.style.display = "flex";
      } else {
        mobileAuth.style.display = "none";
      }
    }
  });

  // Close when a link inside menu is clicked
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A" || e.target.closest("a")) {
      menu.classList.remove("open");
      hamburger.classList.remove("open");
    }
  });

  // Close when clicking anywhere outside the navbar
  document.addEventListener("click", function (e) {
    const header = document.querySelector(".nav-header");
    if (header && !header.contains(e.target)) {
      menu.classList.remove("open");
      hamburger.classList.remove("open");
    }
  });
}
