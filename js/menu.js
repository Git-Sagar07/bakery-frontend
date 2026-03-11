// js/menu.js  — Menu page: loads products from API
// ============================================================

let products = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();

  const params   = new URLSearchParams(window.location.search);
  const category = params.get("category");

  if (category) {
    const btn = [...document.querySelectorAll(".menu-filters button")]
      .find(b => {
        const t = b.textContent.trim().toLowerCase();
        return t === category.toLowerCase() || t === category.toLowerCase() + "s" || t === category.toLowerCase().replace(/s$/, "");
      });
    displayProducts(products.filter(p => p.category === category));
    if (btn) {
      document.querySelectorAll(".menu-filters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
  } else {
    displayProducts(products);
  }
});

// ── Load products from API ────────────────────────────────────
async function loadProducts() {
  const res = await api.get("/products");
  if (res && res.success) {
    products = res.products;
  } else {
    showNotification("Error loading products! ❌");
  }
}

// ── Display products ─────────────────────────────────────────
function displayProducts(productsToDisplay) {
  const menuGrid  = document.getElementById("menuGrid");
  const cartCache = JSON.parse(localStorage.getItem("cartCache") || "[]"); // local mirror for instant UI

  if (productsToDisplay.length === 0) {
    menuGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <div style="font-size:4rem;margin-bottom:15px;">🍞</div>
        <h3 style="color:#555;">No products found in this category.</h3>
      </div>`;
    return;
  }

  const favorites = JSON.parse(localStorage.getItem("favCache") || "[]");

  menuGrid.innerHTML = productsToDisplay.map(product => {
    const isFav     = favorites.includes(product.id);
    const cartItem  = cartCache.find(i => i.id === product.id);
    const cartQty   = cartItem ? cartItem.quantity : 0;

    const cartBtnHtml = cartQty > 0
      ? `<div class="cart-qty-control">
           <button class="qty-mini-btn" onclick='changeCartQty("${product.id}", -1)'>−</button>
           <span class="qty-mini-val">${cartQty}</span>
           <button class="qty-mini-btn" onclick='changeCartQty("${product.id}", 1)'>+</button>
         </div>`
      : `<button class="add-to-cart-btn" onclick='addToCart("${product.id}")'>Add to Cart 🛒</button>`;

    return `
      <div class="menu-card" data-category="${product.category}" id="card-${product.id}">
        <div class="card-image">
          <img src="${product.image}" alt="${product.name}"
            onerror="this.src='https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&q=80'" />
          <button class="favorite-btn ${isFav ? "favorite-active" : ""}"
            onclick='toggleFavorite("${product.id}")'
            title="${isFav ? "Remove from favorites" : "Add to favorites"}"
          >${isFav ? "❤️" : "🤍"}</button>
        </div>
        <div class="card-content">
          <h3>${product.name}</h3>
          <p class="description">${product.description}</p>
          <div class="card-footer">
            <div class="price-info">
              <span class="price">₹${product.price}</span>
              <span class="unit">${product.unit}</span>
            </div>
            <div class="cart-btn-wrapper" id="cartCtrl-${product.id}">
              ${cartBtnHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ── Refresh local cart cache from API ────────────────────────
async function refreshCartCache() {
  if (!isLoggedIn()) return;
  const res = await api.get("/cart");
  if (res && res.success) {
    localStorage.setItem("cartCache", JSON.stringify(res.cart));
  }
}

// ── Add to cart ───────────────────────────────────────────────
async function addToCart(productId) {
  if (!isLoggedIn()) {
    showNotification("Please login to add items to cart! 🔐");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) return;

  const res = await api.post("/cart", { productId, quantity: 1 });
  if (res && res.success) {
    localStorage.setItem("cartCache", JSON.stringify(res.cart));
    const newItem = res.cart.find(i => i.id === productId);
    const newQty  = newItem ? newItem.quantity : 1;
    showNotification(`${product.name} — ${newQty} in cart 🛒`);
    updateNavCartCount();

    const wrapper = document.getElementById(`cartCtrl-${productId}`);
    if (wrapper) {
      wrapper.innerHTML = `
        <div class="cart-qty-control">
          <button class="qty-mini-btn" onclick='changeCartQty("${productId}", -1)'>−</button>
          <span class="qty-mini-val">${newQty}</span>
          <button class="qty-mini-btn" onclick='changeCartQty("${productId}", 1)'>+</button>
        </div>`;
    }
  } else {
    showNotification(res?.message || "Could not add to cart. ❌");
  }
}

// ── Change quantity from menu card ───────────────────────────
async function changeCartQty(productId, delta) {
  if (!isLoggedIn()) {
    showNotification("Please login first! 🔐");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  const cache   = JSON.parse(localStorage.getItem("cartCache") || "[]");
  const item    = cache.find(i => i.id === productId);
  const newQty  = (item ? item.quantity : 0) + delta;

  const res = await api.put(`/cart/${productId}`, { quantity: Math.max(0, newQty) });

  if (res && res.success) {
    localStorage.setItem("cartCache", JSON.stringify(res.cart));
    updateNavCartCount();

    const wrapper = document.getElementById(`cartCtrl-${productId}`);
    if (!wrapper) return;

    const updatedItem = res.cart.find(i => i.id === productId);
    const finalQty    = updatedItem ? updatedItem.quantity : 0;

    if (finalQty > 0) {
      wrapper.innerHTML = `
        <div class="cart-qty-control">
          <button class="qty-mini-btn" onclick='changeCartQty("${productId}", -1)'>−</button>
          <span class="qty-mini-val">${finalQty}</span>
          <button class="qty-mini-btn" onclick='changeCartQty("${productId}", 1)'>+</button>
        </div>`;
    } else {
      wrapper.innerHTML = `<button class="add-to-cart-btn" onclick='addToCart("${productId}")'>Add to Cart 🛒</button>`;
      showNotification("Item removed from cart 🗑️");
    }
  } else {
    showNotification(res?.message || "Could not update cart.");
  }
}

// ── Filter products ───────────────────────────────────────────
async function filterProducts(category, event) {
  document.querySelectorAll(".menu-filters button").forEach(b => b.classList.remove("active"));
  if (event?.target) event.target.classList.add("active");

  if (category === "all") {
    displayProducts(products);
  } else {
    const res = await api.get(`/products?category=${category}`);
    if (res && res.success) {
      displayProducts(res.products);
    }
  }
}

// ── Favorites toggle ─────────────────────────────────────────
async function toggleFavorite(productId) {
  if (!isLoggedIn()) {
    showNotification("Please login to save favorites! 🔐");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  const res = await api.post("/favorites", { productId });
  if (res && res.success) {
    const favs = JSON.parse(localStorage.getItem("favCache") || "[]");
    if (res.action === "added") {
      if (!favs.includes(productId)) favs.push(productId);
      showNotification("Added to favorites! ❤️");
    } else {
      const idx = favs.indexOf(productId);
      if (idx > -1) favs.splice(idx, 1);
      showNotification("Removed from favorites! 💔");
    }
    localStorage.setItem("favCache", JSON.stringify(favs));

    // Refresh button appearance
    const btn = document.querySelector(`#card-${productId} .favorite-btn`);
    if (btn) {
      const isNowFav = res.action === "added";
      btn.textContent = isNowFav ? "❤️" : "🤍";
      btn.classList.toggle("favorite-active", isNowFav);
    }
  } else {
    showNotification(res?.message || "Could not update favorites.");
  }
}

// ── Notification ─────────────────────────────────────────────
function showNotification(message) {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();
  const n = document.createElement("div");
  n.className   = "notification";
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.classList.add("show"), 100);
  setTimeout(() => { n.classList.remove("show"); setTimeout(() => n.remove(), 300); }, 3000);
}
