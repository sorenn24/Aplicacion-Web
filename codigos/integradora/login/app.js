// app.js — Login/Registro (Back-End API + JWT) — exclusivo del LOGIN
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ===== API base =====
  // ⬇⬇⬇ AHORA usando tu backend en Render
  const API_URL = "https://medihom-web.onrender.com/api/auth";
  const STORAGE_CURRENT = "currentUser";
  const STORAGE_TOKEN = "auth_token";

  // ===== Notificaciones simples (igual que tu versión) =====
  function notify(msg, type = "info") {
    const box = $("#notifications");
    if (!box) { alert(msg); return; }
    const el = document.createElement("div");
    el.className =
      "px-4 py-3 rounded-xl shadow text-white text-sm " +
      (type === "error" ? "bg-red-500" :
       type === "success" ? "bg-green-600" : "bg-gray-800");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ===== Helpers de sesión =====
  function setCurrentUser(user) {
    localStorage.setItem(STORAGE_CURRENT, JSON.stringify(user));
  }
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function setToken(token) {
    localStorage.setItem(STORAGE_TOKEN, token);
  }
  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  // ===== Validaciones =====
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function isValidPassword(pw) {
    return typeof pw === "string" && pw.length >= 6;
  }

  // ===== UI: toggle entre Login y Registro =====
  function showLogin() {
    $("#loginScreen")?.classList.remove("hidden");
    $("#registerScreen")?.classList.add("hidden");
  }
  function showRegister() {
    $("#registerScreen")?.classList.remove("hidden");
    $("#loginScreen")?.classList.add("hidden");
  }

  // ===== Handlers (ahora contra la API en Render) =====
  async function onLoginSubmit(e) {
    e.preventDefault();
    const email = $("#loginEmail")?.value.trim();
    const password = $("#loginPassword")?.value;

    if (!isValidEmail(email)) return notify("Correo inválido", "error");
    if (!isValidPassword(password)) return notify("La contraseña debe tener mínimo 6 caracteres", "error");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials: "include", // si luego usas cookies httpOnly
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return notify(data.message || "Credenciales incorrectas", "error");
      }

      // Guardar token y usuario
      if (data.token) setToken(data.token);
      if (data.user) setCurrentUser(data.user);

      notify("Ingreso exitoso", "success");

      // ⬇⬇⬇ redirigir al dashboard del Static Site
      window.location.href = "../dashboard/index.html";
    } catch (err) {
      console.error(err);
      notify("No se pudo conectar con el servidor", "error");
    }
  }

  async function onRegisterSubmit(e) {
    e.preventDefault();
    const name = $("#registerName")?.value.trim();
    const email = $("#registerEmail")?.value.trim();
    const password = $("#registerPassword")?.value;
    const role = $("#registerRole")?.value || "patient"; // mantiene tu selector

    if (!name) return notify("El nombre es obligatorio", "error");
    if (!isValidEmail(email)) return notify("Correo inválido", "error");
    if (!isValidPassword(password)) return notify("La contraseña debe tener mínimo 6 caracteres", "error");

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials: "include",
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return notify(
          data.message || data.errors?.[0]?.msg || "No se pudo registrar",
          "error"
        );
      }

      if (data.token) setToken(data.token);
      if (data.user) setCurrentUser(data.user);

      notify("Cuenta creada", "success");

      // ➜ Después de registrarse, llévalo directo al dashboard
      window.location.href = "../dashboard/index.html";
    } catch (err) {
      console.error(err);
      notify("No se pudo conectar con el servidor", "error");
    }
  }

  function bindEvents() {
    $("#loginForm")?.addEventListener("submit", onLoginSubmit);
    $("#registerForm")?.addEventListener("submit", onRegisterSubmit);
    $("#showRegister")?.addEventListener("click", showRegister);
    $("#showLogin")?.addEventListener("click", showLogin);
  }

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", () => {
    // si ya hay sesión, ir directo al dashboard
    const current = getCurrentUser();
    if (current?.email && getToken()) {
      window.location.href = "../dashboard/index.html";
      return;
    }
    bindEvents();
  });
})();

