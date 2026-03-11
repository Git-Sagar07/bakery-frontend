// js/auth.js
// ============================================================
//  Auth page logic — Login / Signup / Forgot Password
//  Calls backend API instead of localStorage
// ============================================================

function isValidPhone(val) {
  return /^[6-9]\d{9}$/.test(val.replace(/[\s\-+]/g, ""));
}
function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

document.addEventListener("DOMContentLoaded", () => {
  // Phone: digits only, max 10
  document.querySelectorAll("input[type='tel'], #signupPhone").forEach(el => {
    el.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 10);
    });
  });

  // Name: no digits
  const nameEl = document.getElementById("signupName");
  if (nameEl) nameEl.addEventListener("input", function () {
    this.value = this.value.replace(/[0-9]/g, "");
  });

  // Confirm password live feedback
  const confirmPwd = document.getElementById("signupConfirmPassword");
  if (confirmPwd) {
    confirmPwd.addEventListener("input", function () {
      const pwd = document.getElementById("signupPassword").value;
      this.style.borderColor = this.value ? (this.value === pwd ? "#27ae60" : "#e74c3c") : "";
    });
  }

  // Password strength meter
  const pwd = document.getElementById("signupPassword");
  if (pwd) pwd.addEventListener("input", function () { showPasswordStrength(this.value); });

  // Show "password changed" message from profile settings redirect
  if (sessionStorage.getItem("pwdChanged")) {
    showAuthSuccess("Password changed. Please login with your new password.");
    sessionStorage.removeItem("pwdChanged");
  }
});

function showPasswordStrength(val) {
  const bar = document.getElementById("pwdStrength");
  if (!bar) return;
  if (!val) { bar.textContent = ""; return; }

  const missing = [];
  if (val.length < 8)            missing.push("8+ chars");
  if (!/[A-Z]/.test(val))        missing.push("uppercase");
  if (!/[0-9]/.test(val))        missing.push("number");
  if (!/[^A-Za-z0-9]/.test(val)) missing.push("special char");

  const score  = 4 - missing.length;
  const labels = ["Very Weak 🔴", "Weak 🟠", "Fair 🟡", "Strong 🟢"];
  const colors = ["#e74c3c", "#e67e22", "#f1c40f", "#27ae60"];

  bar.style.color  = colors[score - 1] || "#e74c3c";
  bar.textContent  = score === 4
    ? "Very Strong 💪"
    : `${labels[score - 1] || "Very Weak 🔴"} — needs: ${missing.join(", ")}`;
}

// ── LOGIN ────────────────────────────────────────────────────
async function login() {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) { showAuthError("Please fill in all fields."); return; }
  if (!isValidEmail(email)) { showAuthError("Please enter a valid email address."); return; }

  const btn = document.querySelector(".btn-auth");
  if (btn) { btn.disabled = true; btn.textContent = "Logging in..."; }

  const res = await api.post("/auth/login", { email, password });

  if (btn) { btn.disabled = false; btn.textContent = "Login"; }

  if (res && res.success) {
    window._currentUser = res.user;
    showAuthSuccess("Login successful! Redirecting...");
    setTimeout(() => { window.location.href = "/index.html"; }, 900);
  } else {
    showAuthError(res?.message || "Login failed. Please try again.");
  }
}

// ── SIGNUP ────────────────────────────────────────────────────
async function signup() {
  const name            = document.getElementById("signupName").value.trim();
  const email           = document.getElementById("signupEmail").value.trim();
  const phoneEl         = document.getElementById("signupPhone");
  const phone           = phoneEl ? phoneEl.value.trim() : "";
  const password        = document.getElementById("signupPassword").value;
  const confirmPwdEl    = document.getElementById("signupConfirmPassword");
  const confirmPassword = confirmPwdEl ? confirmPwdEl.value : password;

  // Client-side guards
  if (!name || !email || !password) { showAuthError("Please fill in all required fields."); return; }
  if (!isValidEmail(email))          { showAuthError("Please enter a valid email address."); return; }
  if (phone && !isValidPhone(phone)) { showAuthError("Phone must be 10 digits starting with 6–9."); return; }
  if (password.length < 8)           { showAuthError("Password must be at least 8 characters."); return; }
  if (!/[A-Z]/.test(password))       { showAuthError("Password must contain an uppercase letter."); return; }
  if (!/[0-9]/.test(password))       { showAuthError("Password must contain a number."); return; }
  if (!/[^A-Za-z0-9]/.test(password)){ showAuthError("Password must contain a special character (!@#$%)."); return; }
  if (password !== confirmPassword)  { showAuthError("Passwords do not match."); return; }

  const btn = document.querySelector(".btn-auth");
  if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }

  const res = await api.post("/auth/signup", { name, email, phone, password });

  if (btn) { btn.disabled = false; btn.textContent = "Create Account"; }

  if (res && res.success) {
    window._currentUser = res.user;
    showAuthSuccess("Account created! Redirecting...");
    setTimeout(() => { window.location.href = "/index.html"; }, 1000);
  } else {
    showAuthError(res?.message || "Signup failed. Please try again.");
  }
}

// ── FORGOT PASSWORD ─────────────────────────────────────────
async function forgotPassword() {
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) { showAuthError("Please enter your registered email."); return; }
  if (!isValidEmail(email)) { showAuthError("Please enter a valid email address."); return; }

  // Always show same message (security: don't reveal if email exists)
  showAuthSuccess("If this email is registered, reset instructions have been sent.");
}

// ── HELPERS ─────────────────────────────────────────────────
function showAuthError(msg) {
  _setAuthMsg("❌ " + msg, "#fff0f0", "#d32f2f");
}
function showAuthSuccess(msg) {
  _setAuthMsg("✅ " + msg, "#f0fff4", "#27ae60");
}
function _setAuthMsg(text, bg, color) {
  let el = document.getElementById("authMsg");
  if (!el) {
    el = document.createElement("p");
    el.id = "authMsg";
    el.style.cssText = "margin-top:12px;padding:10px 16px;border-radius:10px;font-size:0.88rem;font-weight:600;white-space:pre-wrap;line-height:1.5;";
    const parent = document.querySelector(".auth-form") || document.querySelector(".auth-card");
    if (parent) parent.appendChild(el);
  }
  el.textContent = text;
  el.style.background = bg;
  el.style.color = color;
}
