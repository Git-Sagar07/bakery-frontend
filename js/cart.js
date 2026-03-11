// js/cart.js  — Cart page: all data from API
// ============================================================

const DELIVERY_CHARGE   = 49;
const FREE_DELIVERY_MIN = 499;
const GST_RATE          = 0.05;
const VALID_COUPONS     = { SWEET10: 10, BAKERY20: 20, FIRST15: 15 };

let appliedCoupon = null;
let currentCart   = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await isLoggedIn())) {
    showNotification("Please login to view your cart! 🔐");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  await Promise.all([renderCart(), loadSavedAddress()]);
  setupAddressValidation();
});

// ── Render cart from API ─────────────────────────────────────
async function renderCart() {
  const res = await api.get("/cart");
  if (!res || !res.success) {
    showNotification("Could not load cart. ❌");
    return;
  }

  currentCart = res.cart;
  const emptyCart   = document.getElementById("emptyCart");
  const cartContent = document.getElementById("cartContent");
  const countText   = document.getElementById("cartCountText");

  if (currentCart.length === 0) {
    emptyCart.style.display   = "block";
    cartContent.style.display = "none";
    countText.textContent = "Your cart is empty";
    return;
  }

  emptyCart.style.display   = "none";
  cartContent.style.display = "flex";
  const totalItems = currentCart.reduce((s, i) => s + i.quantity, 0);
  countText.textContent = `${totalItems} item${totalItems !== 1 ? "s" : ""} in your cart`;

  renderCartItems(currentCart);
  updateBilling(currentCart);
}

function renderCartItems(cart) {
  const list = document.getElementById("cartItemsList");
  list.innerHTML = cart.map(item => `
    <div class="cart-item" id="item-${item.id}">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img"
        onerror="this.src='https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=80&q=80'" />
      <div class="cart-item-details">
        <h3>${item.name}</h3>
        <p class="cart-item-unit">${item.unit}</p>
        <p class="cart-item-price">₹${item.price} × ${item.quantity} = <strong>₹${item.price * item.quantity}</strong></p>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        <button class="remove-btn" onclick="removeItem('${item.id}')" title="Remove item">🗑️</button>
      </div>
    </div>
  `).join("");
}

function updateBilling(cart) {
  const subtotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery   = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_CHARGE;
  const gst        = Math.round(subtotal * GST_RATE);
  let   discount   = 0;
  if (appliedCoupon && VALID_COUPONS[appliedCoupon]) {
    discount = Math.round(subtotal * VALID_COUPONS[appliedCoupon] / 100);
  }
  const grandTotal = subtotal + delivery + gst - discount;

  document.getElementById("itemsTotal").textContent    = `₹${subtotal}`;
  document.getElementById("deliveryCharge").textContent = delivery === 0 ? "FREE 🎉" : `₹${delivery}`;
  document.getElementById("gstAmount").textContent     = `₹${gst}`;
  document.getElementById("grandTotal").textContent    = `₹${grandTotal}`;

  const discountRow = document.getElementById("discountRow");
  if (discount > 0) {
    discountRow.style.display = "flex";
    document.getElementById("discountAmount").textContent = `-₹${discount}`;
  } else {
    discountRow.style.display = "none";
  }

  const totalSavings = (delivery === 0 ? DELIVERY_CHARGE : 0) + discount;
  const badge = document.getElementById("savingsBadge");
  if (badge) {
    badge.style.display = totalSavings > 0 ? "flex" : "none";
    if (totalSavings > 0) document.getElementById("savingsAmount").textContent = `₹${totalSavings}`;
  }
}

// ── Quantity change ──────────────────────────────────────────
async function changeQty(productId, delta) {
  const item   = currentCart.find(i => i.id === productId);
  if (!item) return;
  const newQty = item.quantity + delta;

  const res = await api.put(`/cart/${productId}`, { quantity: Math.max(0, newQty) });
  if (res && res.success) {
    currentCart = res.cart;
    if (newQty <= 0) showNotification("Item removed! 🗑️");
    renderCartItems(currentCart);
    updateBilling(currentCart);
    updateNavCartCount();

    const totalItems = currentCart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById("cartCountText").textContent =
      currentCart.length === 0 ? "Your cart is empty"
        : `${totalItems} item${totalItems !== 1 ? "s" : ""} in your cart`;

    if (currentCart.length === 0) {
      document.getElementById("emptyCart").style.display   = "block";
      document.getElementById("cartContent").style.display = "none";
    }
  }
}

async function removeItem(productId) {
  const res = await api.delete(`/cart/${productId}`);
  if (res && res.success) { currentCart = res.cart; showNotification("Item removed! 🗑️"); renderCart(); updateNavCartCount(); }
}

async function clearCart() {
  if (!confirm("Are you sure you want to clear your cart?")) return;
  const res = await api.delete("/cart");
  if (res && res.success) { currentCart = []; appliedCoupon = null; showNotification("Cart cleared! 🗑️"); renderCart(); updateNavCartCount(); }
}

// ── Address ──────────────────────────────────────────────────
async function loadSavedAddress() {
  const user = getUser();
  if (!user) return;

  const res = await api.get("/user/address");
  if (res && res.success && res.address) {
    const a = res.address;
    document.getElementById("addrName").value     = a.name     || user.name  || "";
    document.getElementById("addrPhone").value    = a.phone    || user.phone || "";
    document.getElementById("addrStreet").value   = a.street   || "";
    document.getElementById("addrCity").value     = a.city     || "";
    document.getElementById("addrPin").value      = a.pin      || "";
    document.getElementById("addrLandmark").value = a.landmark || "";
    showSavedAddress(a);
  } else {
    document.getElementById("addrName").value  = user.name  || "";
    document.getElementById("addrPhone").value = user.phone || "";
  }
}

function showSavedAddress(a) {
  document.getElementById("addressText").innerHTML = `
    <strong>${a.name}</strong> · ${a.phone}<br/>
    ${a.street}, ${a.city} - ${a.pin}
    ${a.landmark ? `<br/><em>Near: ${a.landmark}</em>` : ""}
  `;
  document.getElementById("savedAddress").style.display = "block";
  document.getElementById("addressForm").style.display  = "none";
}

function toggleAddressForm(show) {
  document.getElementById("addressForm").style.display  = show ? "block" : "none";
  document.getElementById("savedAddress").style.display = show ? "none"  : "block";
}

async function saveAddress() {
  const name     = document.getElementById("addrName").value.trim();
  const phone    = document.getElementById("addrPhone").value.trim();
  const street   = document.getElementById("addrStreet").value.trim();
  const city     = document.getElementById("addrCity").value.trim();
  const pin      = document.getElementById("addrPin").value.trim();
  const landmark = document.getElementById("addrLandmark").value.trim();

  if (!name || !phone || !street || !city || !pin) {
    showNotification("Please fill all required fields! ⚠️"); return;
  }

  const btn = document.querySelector(".btn-save-address");
  if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

  const res = await api.post("/user/address", { name, phone, street, city, pin, landmark });

  if (btn) { btn.disabled = false; btn.textContent = "Save Address 📍"; }

  if (res && res.success) {
    showSavedAddress({ name, phone, street, city, pin, landmark });
    showNotification("Address saved! 📍");
  } else {
    showNotification(res?.message || "Could not save address. ⚠️");
  }
}

function setupAddressValidation() {
  // Phone: digits only
  const phoneEl = document.getElementById("addrPhone");
  if (phoneEl) phoneEl.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 10);
  });

  // Pincode: digits only
  const pinEl = document.getElementById("addrPin");
  if (pinEl) pinEl.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 6);
  });

  // Name: no digits
  const nameEl = document.getElementById("addrName");
  if (nameEl) nameEl.addEventListener("input", function () {
    this.value = this.value.replace(/[0-9]/g, "");
  });

  // City: letters/spaces/hyphens only
  const cityEl = document.getElementById("addrCity");
  if (cityEl) cityEl.addEventListener("input", function () {
    const cleaned = this.value.replace(/[^a-zA-Z\s\-\.]/g, "");
    if (cleaned !== this.value) this.value = cleaned;
  });
}

// ── Coupon ───────────────────────────────────────────────────
function applyCoupon() {
  const code  = document.getElementById("couponInput").value.trim().toUpperCase();
  const msgEl = document.getElementById("couponMsg");
  if (!code)                  { msgEl.textContent = "Please enter a coupon code."; msgEl.className = "coupon-msg error"; return; }
  if (appliedCoupon === code) { msgEl.textContent = "Coupon already applied!"; msgEl.className = "coupon-msg error"; return; }

  if (VALID_COUPONS[code]) {
    appliedCoupon     = code;
    msgEl.textContent = `✅ "${code}" applied! ${VALID_COUPONS[code]}% off!`;
    msgEl.className   = "coupon-msg success";
    showNotification(`Coupon applied! ${VALID_COUPONS[code]}% off 🎉`);
    updateBilling(currentCart);
  } else {
    msgEl.textContent = "❌ Invalid coupon. Try SWEET10, BAKERY20 or FIRST15.";
    msgEl.className   = "coupon-msg error";
  }
}

// ── Place Order ──────────────────────────────────────────────
async function placeOrder() {
  if (currentCart.length === 0) { showNotification("Your cart is empty! 🛒"); return; }

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled    = true;
  btn.textContent = "Placing Order... ⏳";

  const res = await api.post("/orders", { couponCode: appliedCoupon });

  btn.disabled    = false;
  btn.textContent = "Place Order 🎉";

  if (res && res.success) {
    currentCart   = [];
    appliedCoupon = null;
    updateNavCartCount();
    document.getElementById("orderIdText").textContent   = res.orderId;
    document.getElementById("orderModal").style.display  = "flex";
  } else {
    showNotification(res?.message || "Could not place order. Please try again. ❌");
  }
}

function closeModal() {
  document.getElementById("orderModal").style.display = "none";
  window.location.href = "profile.html?tab=orders";
}
function continueShopping() {
  document.getElementById("orderModal").style.display = "none";
  window.location.href = "menu.html";
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
