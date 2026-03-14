// js/profile.js  — Profile page: all data from API
// ============================================================

const ACTIVE_STATUSES  = ["Confirmed", "Pending", "Out for Delivery"];
const HISTORY_STATUSES = ["Delivered", "Cancelled", "Completed"];

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await isLoggedIn())) {
    showNotification("Please login to view your profile! 🔐");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  loadUserProfile();
  await Promise.all([loadFavorites(), loadActiveOrders(), loadOrderHistory(), updateCartBadge()]);
  setupValidation();

  const params   = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  if (tabParam && ["favorites","orders","history","settings"].includes(tabParam)) {
    const btn = document.querySelector(`.snav-btn[data-tab="${tabParam}"]`);
    if (btn) btn.click();
  }
});

// ── Load profile ─────────────────────────────────────────────
async function loadUserProfile() {
  const user = await getUser();
  if (!user) return;

  const sidebarName  = document.getElementById("sidebarName");
  const sidebarEmail = document.getElementById("sidebarEmail");
  const avatarImg    = document.getElementById("profileAvatar");

  if (sidebarName)  sidebarName.textContent  = user.name  || "User";
  if (sidebarEmail) sidebarEmail.textContent = user.email || "";
  if (avatarImg) {
    avatarImg.onerror = function () {
      this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=d35400&color=fff&size=120&bold=true`;
    };
  }

  const settingsName  = document.getElementById("settingsName");
  const settingsEmail = document.getElementById("settingsEmail");
  const settingsPhone = document.getElementById("settingsPhone");
  if (settingsName)  settingsName.value  = user.name  || "";
  if (settingsEmail) settingsEmail.value = user.email || "";
  if (settingsPhone) settingsPhone.value = user.phone || "";
}

// ── Cart badge ────────────────────────────────────────────────
async function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const res = await api.get("/cart");
  if (res && res.success) {
    const total = res.cart.reduce((s, i) => s + i.quantity, 0);
    badge.textContent   = total;
    badge.style.display = total > 0 ? "inline-flex" : "none";
  }
}

// ── Tab switching ────────────────────────────────────────────
function switchTab(tabName, event) {
  document.querySelectorAll(".profile-section-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".snav-btn").forEach(b => b.classList.remove("active"));

  const pane = document.getElementById(`${tabName}-tab`);
  if (pane) pane.classList.add("active");

  const btn = event?.currentTarget || document.querySelector(`.snav-btn[data-tab="${tabName}"]`);
  if (btn) btn.classList.add("active");
}

// ── Favorites ────────────────────────────────────────────────
async function loadFavorites() {
  const res = await api.get("/favorites");
  const grid        = document.getElementById("favoritesGrid");
  const noFavorites = document.getElementById("noFavorites");
  if (!grid) return;

  if (!res || !res.success || res.favorites.length === 0) {
    grid.style.display        = "none";
    noFavorites.style.display = "block";
    return;
  }

  grid.style.display        = "grid";
  noFavorites.style.display = "none";

  grid.innerHTML = res.favorites.map(product => `
    <div class="favorite-card">
      <div class="favorite-image">
        <img src="${product.image}" alt="${product.name}"
          onerror="this.style.background='#fdebd0'" />
        <button class="remove-favorite-btn" onclick='removeFavorite("${product.id}")' title="Remove">❌</button>
      </div>
      <div class="favorite-content">
        <h3>${product.name}</h3>
        <p class="favorite-description">${product.description}</p>
        <div class="favorite-footer">
          <div class="favorite-price-info">
            <span class="favorite-price">₹${product.price}</span>
            <span class="favorite-unit">${product.unit}</span>
          </div>
          <button class="add-to-cart-btn" onclick='addToCartFromFavorites("${product.id}")'>
            Add to Cart 🛒
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// ── Orders ───────────────────────────────────────────────────
function renderOrderCard(order, showCancel) {
  const statusClass = `status-${order.status.toLowerCase().replace(/\s+/g, "-")}`;
  const address     = order.address || {};
  return `
    <div class="order-card" id="order-${order.id}">
      <div class="order-card-header">
        <div class="order-meta">
          <span class="order-id-label">Order #${order.id}</span>
          <span class="order-date">📅 ${new Date(order.placed_at).toLocaleDateString("en-IN")}</span>
        </div>
        <span class="order-status ${statusClass}">${order.status}</span>
      </div>
      <div class="order-items-list">
        ${order.items.map(item => `
          <div class="order-item-row">
            <img src="${item.image}" alt="${item.name}" class="order-item-thumb"
              onerror="this.style.background='#fdebd0'" />
            <span class="order-item-name">${item.name}</span>
            <span class="order-item-qty">× ${item.quantity}</span>
            <span class="order-item-price">₹${item.price * item.quantity}</span>
          </div>
        `).join("")}
      </div>
      <div class="order-card-footer">
        <div class="order-address">📍 ${address.street || ""}, ${address.city || ""} - ${address.pin || ""}</div>
        <div class="order-total">Total: <strong>₹${order.grand_total}</strong></div>
      </div>
      <div class="order-actions">
        <a href="menu.html" class="btn-reorder">Reorder 🔁</a>
        ${showCancel ? `<button class="btn-cancel-order" onclick='cancelOrder("${order._id}")'>Cancel Order ✕</button>` : ""}
      </div>
    </div>
  `;
}

async function loadActiveOrders() {
  const res    = await api.get("/orders?status=active");
  const list   = document.getElementById("activeOrdersList");
  const noEl   = document.getElementById("noActiveOrders");
  const badge  = document.getElementById("activeOrdersBadge");
  if (!list) return;

  const orders = res?.success ? res.orders : [];

  if (badge) {
    badge.textContent   = orders.length;
    badge.style.display = orders.length > 0 ? "inline-flex" : "none";
  }

  if (orders.length === 0) {
    list.style.display  = "none";
    noEl.style.display  = "block";
    return;
  }

  list.style.display  = "block";
  noEl.style.display  = "none";
  list.innerHTML = orders.map(o => renderOrderCard(o, true)).join("");
}

async function loadOrderHistory() {
  const res    = await api.get("/orders?status=history");
  const list   = document.getElementById("historyOrdersList");
  const noEl   = document.getElementById("noHistoryOrders");
  if (!list) return;

  const orders = res?.success ? res.orders : [];

  if (orders.length === 0) {
    list.style.display  = "none";
    noEl.style.display  = "block";
    return;
  }

  list.style.display  = "block";
  noEl.style.display  = "none";
  list.innerHTML = orders.map(o => renderOrderCard(o, false)).join("");
}

async function cancelOrder(orderId) {
  if (!confirm("Are you sure you want to cancel this order?")) return;
  const res = await api.patch(`/orders/${orderId}/cancel`);
  if (res && res.success) {
    showNotification("Order cancelled. 😔 We hope to serve you again!");
    loadActiveOrders();
    loadOrderHistory();
  } else {
    showNotification(res?.message || "Could not cancel order.");
  }
}

// ── Favorites actions ────────────────────────────────────────
async function removeFavorite(productId) {
  const res = await api.delete(`/favorites/${productId}`);
  if (res && res.success) { showNotification("Removed from favorites! 💔"); loadFavorites(); }
}

async function addToCartFromFavorites(productId) {
  const res = await api.post("/cart", { productId, quantity: 1 });
  if (res && res.success) {
    showNotification("Added to cart! 🛒");
    updateCartBadge();
  } else {
    showNotification(res?.message || "Could not add to cart.");
  }
}

// ── Settings ────────────────────────────────────────────────
async function saveSettings() {
  const name  = document.getElementById("settingsName").value.trim();
  const email = document.getElementById("settingsEmail").value.trim();
  const phone = document.getElementById("settingsPhone").value.trim();

  const btn = document.querySelector(".btn-save-settings");
  if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

  const res = await api.put("/user/profile", { name, email, phone });

  if (btn) { btn.disabled = false; btn.textContent = "Save Changes ✅"; }

  if (res && res.success) {
    if (window._currentUser) { window._currentUser.name = name; window._currentUser.email = email; window._currentUser.phone = phone; }
    showNotification("Settings saved! ✅");
    loadUserProfile();
    updateNavbar();
  } else {
    showNotification(res?.message || "Could not save settings. ⚠️");
  }
}

async function changePassword() {
  const currentPwd    = document.getElementById("currentPassword").value;
  const newPwd        = document.getElementById("newPassword").value;
  const confirmNewPwd = document.getElementById("confirmNewPassword").value;

  if (!currentPwd || !newPwd || !confirmNewPwd) { showNotification("Please fill in all password fields! ⚠️"); return; }
  if (newPwd !== confirmNewPwd)                  { showNotification("New passwords do not match! ❌"); return; }

  const btn = document.querySelector(".btn-change-pwd");
  if (btn) { btn.disabled = true; btn.textContent = "Changing..."; }

  const res = await api.put("/user/password", { currentPassword: currentPwd, newPassword: newPwd });

  if (btn) { btn.disabled = false; btn.textContent = "Change Password 🔒"; }

  if (res && res.success) {
    showNotification("Password changed! Redirecting to login... 🔒");
    sessionStorage.setItem("pwdChanged", "1");
    setTimeout(() => { window.location.href = "login.html"; }, 1800);
  } else {
    showNotification(res?.message || "Could not change password. ❌");
  }
}

// ── Validation setup ─────────────────────────────────────────
function setupValidation() {
  const phoneEl = document.getElementById("settingsPhone");
  if (phoneEl) phoneEl.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 10);
  });

  const newPwd = document.getElementById("newPassword");
  if (newPwd) newPwd.addEventListener("input", function () { showPwdStrength(this.value); });

  const confirmNewPwd = document.getElementById("confirmNewPassword");
  if (confirmNewPwd) confirmNewPwd.addEventListener("input", function () {
    const pwd = document.getElementById("newPassword").value;
    this.style.borderColor = this.value ? (this.value === pwd ? "#27ae60" : "#e74c3c") : "";
  });
}

function showPwdStrength(val) {
  const bar = document.getElementById("newPwdStrength");
  if (!bar) return;
  if (!val) { bar.textContent = ""; return; }
  const missing = [];
  if (val.length < 8)            missing.push("8+ chars");
  if (!/[A-Z]/.test(val))        missing.push("uppercase");
  if (!/[0-9]/.test(val))        missing.push("number");
  if (!/[^A-Za-z0-9]/.test(val)) missing.push("special char");
  const score  = 4 - missing.length;
  const labels = ["Very Weak 🔴","Weak 🟠","Fair 🟡","Strong 🟢"];
  const colors = ["#e74c3c","#e67e22","#f1c40f","#27ae60"];
  bar.style.color  = colors[score - 1] || "#e74c3c";
  bar.textContent  = score === 4 ? "Very Strong 💪" : `${labels[score-1]||"Very Weak 🔴"} — needs: ${missing.join(", ")}`;
}

// ── Notification ─────────────────────────────────────────────
function showNotification(message) {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();
  const n = document.createElement("div");
  n.className = "notification"; n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.classList.add("show"), 100);
  setTimeout(() => { n.classList.remove("show"); setTimeout(() => n.remove(), 300); }, 3000);
}
