// js/checkout.js
// ============================================================
//  Checkout page — Razorpay payment + COD flow
// ============================================================

const VALID_COUPONS = { SWEET10: 10, BAKERY20: 20, FIRST15: 15 };

let orderSummary  = null;   // populated from /api/payment/create-order
let appliedCoupon = null;

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await isLoggedIn())) {
    showToast("Please login to checkout 🔐");
    setTimeout(() => { window.location.href = "login.html"; }, 1400);
    return;
  }

  await loadCheckoutSummary();
  await loadAddress();
  setupPaymentToggle();
});

// ── Load cart summary from backend ───────────────────────────
async function loadCheckoutSummary() {
  const res = await api.get("/cart");
  if (!res || !res.success || res.cart.length === 0) {
    showToast("Your cart is empty! 🛒");
    setTimeout(() => { window.location.href = "cart.html"; }, 1400);
    return;
  }

  const cart     = res.cart;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery = subtotal >= 499 ? 0 : 49;
  const gst      = Math.round(subtotal * 0.05);

  // Store for payment use
  orderSummary = { cart, subtotal, delivery, gst };

  // Render items
  const listEl = document.getElementById("checkoutItemsList");
  listEl.innerHTML = cart.map(item => `
    <div class="co-item">
      <img class="co-item-img" src="${item.image}" alt="${item.name}"
        onerror="this.src='https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=80&q=80'" />
      <div class="co-item-info">
        <strong>${item.name}</strong>
        <span>${item.unit} × ${item.quantity}</span>
      </div>
      <span class="co-item-price">₹${item.price * item.quantity}</span>
    </div>
  `).join("");

  updateTotals();
}

// ── Update totals display ─────────────────────────────────────
function updateTotals() {
  if (!orderSummary) return;

  const { subtotal, delivery, gst } = orderSummary;
  const discount   = appliedCoupon && VALID_COUPONS[appliedCoupon]
    ? Math.round(subtotal * VALID_COUPONS[appliedCoupon] / 100) : 0;
  const grandTotal = subtotal + delivery + gst - discount;

  document.getElementById("co-subtotal").textContent  = `₹${subtotal}`;
  document.getElementById("co-delivery").textContent  = delivery === 0 ? "FREE 🎉" : `₹${delivery}`;
  document.getElementById("co-gst").textContent       = `₹${gst}`;
  document.getElementById("co-total").textContent     = `₹${grandTotal}`;

  const discountRow = document.getElementById("co-discountRow");
  if (discount > 0) {
    discountRow.style.display = "flex";
    document.getElementById("co-discount").textContent = `-₹${discount}`;
  } else {
    discountRow.style.display = "none";
  }

  document.getElementById("checkoutTotals").style.display = "flex";
  document.getElementById("checkoutTotals").style.flexDirection = "column";

  // Update pay button label
  const payBtn = document.getElementById("payBtnText");
  const method = document.querySelector("input[name='payMethod']:checked")?.value;
  if (payBtn) {
    payBtn.textContent = method === "cod"
      ? `Place Order – ₹${grandTotal} (COD) 💵`
      : `Pay ₹${grandTotal} Securely 🔐`;
  }
}

// ── Coupon ────────────────────────────────────────────────────
function applyCoupon() {
  const code  = document.getElementById("coCouponInput").value.trim().toUpperCase();
  const msgEl = document.getElementById("coCouponMsg");

  if (!code) {
    msgEl.textContent = "Please enter a coupon code.";
    msgEl.className   = "coupon-msg error";
    return;
  }

  if (appliedCoupon === code) {
    msgEl.textContent = "Coupon already applied!";
    msgEl.className   = "coupon-msg error";
    return;
  }

  if (VALID_COUPONS[code]) {
    appliedCoupon     = code;
    msgEl.textContent = `✅ "${code}" applied — ${VALID_COUPONS[code]}% off!`;
    msgEl.className   = "coupon-msg success";
    updateTotals();
  } else {
    msgEl.textContent = "❌ Invalid coupon. Try SWEET10, BAKERY20, or FIRST15.";
    msgEl.className   = "coupon-msg error";
  }
}

// ── Address ───────────────────────────────────────────────────
async function loadAddress() {
  const user = getUser();
  const res  = await api.get("/user/address");
  const addr = res?.success && res.address?.street ? res.address : null;

  const display = document.getElementById("addressDisplay");

  if (addr) {
    display.innerHTML = `
      <strong>${addr.name || user?.name || ""}</strong> · ${addr.phone || ""}<br/>
      ${addr.street}, ${addr.city} – ${addr.pin}
      ${addr.landmark ? `<br/><em>Near: ${addr.landmark}</em>` : ""}
    `;
    // Pre-fill edit form too
    document.getElementById("addrName").value     = addr.name     || user?.name  || "";
    document.getElementById("addrPhone").value    = addr.phone    || user?.phone || "";
    document.getElementById("addrStreet").value   = addr.street   || "";
    document.getElementById("addrCity").value     = addr.city     || "";
    document.getElementById("addrPin").value      = addr.pin      || "";
    document.getElementById("addrLandmark").value = addr.landmark || "";
  } else {
    display.innerHTML = `<span style="color:#e74c3c;">⚠️ No delivery address saved. Please add one below.</span>`;
    // Pre-fill name/phone from user
    if (user) {
      document.getElementById("addrName").value  = user.name  || "";
      document.getElementById("addrPhone").value = user.phone || "";
    }
    toggleAddressEdit(true);
  }
}

function toggleAddressEdit(forceOpen) {
  const form    = document.getElementById("addressEditForm");
  const isOpen  = form.style.display !== "none";
  const newState = forceOpen !== undefined ? forceOpen : !isOpen;
  form.style.display = newState ? "block" : "none";
}

async function saveAddressFromCheckout() {
  const name     = document.getElementById("addrName").value.trim();
  const phone    = document.getElementById("addrPhone").value.trim();
  const street   = document.getElementById("addrStreet").value.trim();
  const city     = document.getElementById("addrCity").value.trim();
  const pin      = document.getElementById("addrPin").value.trim();
  const landmark = document.getElementById("addrLandmark").value.trim();

  if (!name || !phone || !street || !city || !pin) {
    showToast("Please fill all required address fields ⚠️"); return;
  }

  const res = await api.post("/user/address", { name, phone, street, city, pin, landmark });
  if (res && res.success) {
    document.getElementById("addressDisplay").innerHTML = `
      <strong>${name}</strong> · ${phone}<br/>
      ${street}, ${city} – ${pin}
      ${landmark ? `<br/><em>Near: ${landmark}</em>` : ""}
    `;
    toggleAddressEdit(false);
    showToast("Address saved ✅");
  } else {
    showToast(res?.message || "Could not save address ⚠️");
  }
}

// ── Payment toggle ────────────────────────────────────────────
function setupPaymentToggle() {
  document.querySelectorAll("input[name='payMethod']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      document.querySelectorAll(".payment-option").forEach(el => el.classList.remove("selected"));
      e.target.closest(".payment-option").classList.add("selected");
      updateTotals(); // update button label
    });
  });
}

// ── Main payment initiator ────────────────────────────────────
async function initiatePayment() {
  const method = document.querySelector("input[name='payMethod']:checked")?.value;

  // Guard: ensure address is saved
  const addrDisplay = document.getElementById("addressDisplay").textContent.trim();
  if (addrDisplay.includes("No delivery address")) {
    showToast("Please save a delivery address first 📍"); return;
  }

  if (method === "cod") {
    await placeOrderCOD();
  } else {
    await openRazorpay();
  }
}

// ── Cash on Delivery flow ─────────────────────────────────────
async function placeOrderCOD() {
  const btn = document.getElementById("payBtn");
  btn.disabled = true;
  document.getElementById("payBtnText").textContent = "Placing Order... ⏳";

  const res = await api.post("/orders", { couponCode: appliedCoupon });

  btn.disabled = false;
  updateTotals();

  if (res && res.success) {
    sessionStorage.setItem("lastOrderId",     res.orderId);
    sessionStorage.setItem("lastOrderMethod", "cod");
    window.location.href = "order-success.html";
  } else {
    showToast(res?.message || "Could not place order ❌");
  }
}

// ── Razorpay online payment flow ──────────────────────────────
async function openRazorpay() {
  const btn = document.getElementById("payBtn");
  btn.disabled = true;
  document.getElementById("payBtnText").textContent = "Opening Payment... ⏳";

  // Step 1: Create Razorpay order on backend
  const orderRes = await api.post("/payment/create-order", { couponCode: appliedCoupon });

  if (!orderRes || !orderRes.success) {
    btn.disabled = false;
    updateTotals();
    showToast(orderRes?.message || "Could not initiate payment ❌");
    return;
  }

  const user = getUser();

  // Step 2: Open Razorpay checkout widget
  const options = {
    key:         orderRes.keyId,
    amount:      orderRes.amount,
    currency:    orderRes.currency,
    name:        "My Bakery 🧁",
    description: "Fresh baked goods order",
    order_id:    orderRes.razorpayOrderId,
    prefill: {
      name:    user?.name  || "",
      email:   user?.email || "",
      contact: orderRes.orderSummary?.address?.phone || "",
    },
    theme: { color: "#d35400" },
    modal: {
      ondismiss: () => {
        btn.disabled = false;
        updateTotals();
        showToast("Payment cancelled. Your cart is still saved.");
      },
    },
    handler: async (response) => {
      // Step 3: Verify payment on backend
      document.getElementById("payBtnText").textContent = "Verifying Payment... 🔐";

      const verifyRes = await api.post("/payment/verify", {
        razorpay_order_id:   response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature:  response.razorpay_signature,
        couponCode:          appliedCoupon,
      });

      btn.disabled = false;
      updateTotals();

      if (verifyRes && verifyRes.success) {
        sessionStorage.setItem("lastOrderId",     verifyRes.orderId);
        sessionStorage.setItem("lastOrderMethod", "online");
        sessionStorage.setItem("lastPaymentId",   response.razorpay_payment_id);
        window.location.href = "order-success.html";
      } else {
        showToast(verifyRes?.message || "Payment verification failed. Contact support ❌");
      }
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

// ── Toast notification ────────────────────────────────────────
function showToast(message) {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();
  const n = document.createElement("div");
  n.className   = "notification";
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.classList.add("show"), 80);
  setTimeout(() => { n.classList.remove("show"); setTimeout(() => n.remove(), 300); }, 3500);
}
