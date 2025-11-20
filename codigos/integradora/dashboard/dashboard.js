// dashboard.js — Panel paciente/terapeuta con API (MongoDB)
(function () {
  "use strict";

  // ===================== CONFIGURACIÓN API =====================
  // Si estás en localhost usa 4000, si no, usa el backend en Render
  const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000/api"
      : "https://medihom-web.onrender.com/api";

  const LOGIN_PATH = "../login/index.html";
  const STORAGE_CURRENT = "currentUser";
  const STORAGE_TOKEN = "auth_token";

  // ===================== Helpers DOM =====================
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  function notify(msg, type = "info") {
    const box = $("#notifications");
    if (!box) {
      alert(msg);
      return;
    }
    const el = document.createElement("div");
    el.className =
      "px-4 py-3 rounded-xl shadow text-white text-sm notification " +
      (type === "error"
        ? "bg-red-500"
        : type === "success"
        ? "bg-green-600"
        : "bg-gray-800");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ===================== Sesión (localStorage) =====================
  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_CURRENT);
  }

  function requireSession() {
    const user = getCurrentUser();
    const token = getToken();
    if (!user || !token) {
      clearSession();
      window.location.href = LOGIN_PATH;
      return null;
    }
    return user;
  }

  // ===================== Helper de fetch con auth =====================
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Sesión expirada / token inválido
      clearSession();
      notify("Tu sesión ha expirado. Inicia sesión de nuevo.", "error");
      window.location.href = LOGIN_PATH;
      throw new Error("No autorizado");
    }

    return res;
  }

  // ===================== API RUTINAS / PROGRESO =====================
  async function apiGetAllRoutines() {
    const res = await authFetch(`${API_BASE}/routines`);
    if (!res.ok) throw new Error("No se pudieron cargar las rutinas");
    return res.json();
  }

  async function apiGetAssigned() {
    const res = await authFetch(`${API_BASE}/routines/assigned`);
    if (!res.ok) throw new Error("No se pudieron cargar las asignadas");
    return res.json();
  }

  async function apiGetProgress() {
    const res = await authFetch(`${API_BASE}/routines/progress`);
    if (!res.ok) throw new Error("No se pudo leer el progreso");
    return res.json();
  }

  async function apiAssignRoutine(routineId) {
    const res = await authFetch(`${API_BASE}/routines/assign`, {
      method: "POST",
      body: JSON.stringify({ routineId }),
    });
    if (!res.ok) throw new Error("No se pudo asignar la rutina");
    return res.json();
  }

  async function apiCreateRoutine(payload) {
    const res = await authFetch(`${API_BASE}/routines`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("No se pudo crear la rutina");
    return res.json();
  }

  async function apiMarkProgress({ routineId, dayIndex, totalDays, exerciseName }) {
    const res = await authFetch(`${API_BASE}/routines/progress`, {
      method: "POST",
      body: JSON.stringify({ routineId, dayIndex, totalDays, exerciseName }),
    });
    if (!res.ok) throw new Error("No se pudo registrar el progreso");
    return res.json();
  }

  // ===================== Tabs según rol =====================
  const ROLE_TABS = {
    patient: [
      { id: "routinesSection", label: "Rutinas" },
      { id: "progressSection", label: "Progreso" },
      { id: "profileSection", label: "Perfil" },
      { id: "supportSection", label: "Soporte" },
    ],
    therapist: [
      { id: "therapistSection", label: "Panel Terapeuta" },
      { id: "profileSection", label: "Perfil" },
      { id: "supportSection", label: "Soporte" },
    ],
  };

  function buildTabs(role, currentUser) {
    const tabs = ROLE_TABS[role] || ROLE_TABS.patient;
    const nav = $("#navigationTabs");
    if (!nav) return;
    nav.innerHTML = "";

    tabs.forEach((t, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "px-3 py-2 text-sm border-b-2 border-transparent hover:border-blue-500";
      btn.textContent = t.label;
      btn.dataset.target = t.id;
      btn.addEventListener("click", async () => {
        $$("#navigationTabs button").forEach((b) =>
          b.classList.remove("border-blue-600", "text-blue-600")
        );
        btn.classList.add("border-blue-600", "text-blue-600");
        $$(".section").forEach((s) => s.classList.add("hidden"));
        document.getElementById(t.id)?.classList.remove("hidden");
        if (t.id === "progressSection") {
          await refreshProgressDashboard(currentUser);
        }
      });
      nav.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  // ===================== PACIENTE: Rutinas =====================
  async function renderPatientRoutines(user) {
    const routinesGrid = $("#routinesGrid");
    if (!routinesGrid) return;

    try {
      const [assigned, progressList] = await Promise.all([
        apiGetAssigned(),
        apiGetProgress(),
      ]);

      routinesGrid.innerHTML = "";

      if (!assigned.length) {
        routinesGrid.innerHTML = `
          <div class="col-span-1 md:col-span-2 lg:col-span-3">
            <div class="bg-white rounded-lg border p-6 text-gray-600">
              Aún no tienes rutinas asignadas. Usa “+ Seleccionar Rutina”.
            </div>
          </div>`;
        return;
      }

      assigned.forEach((r) => {
        const rec = progressList.find((p) => p.routineId === r.id);
        const total = r.days?.length || 3;
        let daysDone = rec?.daysDone || [];
        if (daysDone.length < total) {
          daysDone = [
            ...daysDone,
            ...Array.from({ length: total - daysDone.length }, () => false),
          ];
        }
        const done = daysDone.filter(Boolean).length;
        const pct = Math.round((done / total) * 100);

        const card = document.createElement("article");
        card.className = "bg-white rounded-lg card-minimal p-5 border";
        card.innerHTML = `
          <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
          <p class="text-sm text-gray-500 mb-2">${r.category} · ${
          r.difficulty
        } · ${r.duration} min</p>
          <p class="text-gray-600 mb-4">${r.description}</p>

          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progreso</span><span>${done}/${total} (${pct}%)</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-500 h-2 rounded-full progress-bar" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
                    data-act="start" data-id="${r.id}">
              ${done < total ? "Continuar" : "Revisar"}
            </button>
            <button class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200"
                    data-act="details" data-id="${r.id}">
              Detalles
            </button>
          </div>
        `;
        routinesGrid.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      notify("No se pudieron cargar tus rutinas", "error");
    }
  }

  // Abre la pantalla de ejercicio usando SIEMPRE el progreso real del backend
  async function openExerciseScreen(user, routine) {
    const scr = $("#exerciseScreen");
    if (!scr) return;

    const progressList = await apiGetProgress();
    const rec = progressList.find((p) => p.routineId === routine.id);

    const totalDays = routine.days?.length || 3;
    let daysDone = rec?.daysDone || [];
    if (daysDone.length < totalDays) {
      daysDone = [
        ...daysDone,
        ...Array.from({ length: totalDays - daysDone.length }, () => false),
      ];
    }

    // siguiente día pendiente
    let dayIndex = daysDone.findIndex((v) => !v);
    if (dayIndex === -1) {
      // si ya está todo completado, se queda en el último para revisar
      dayIndex = totalDays - 1;
    }

    const day =
      routine.days?.[dayIndex] || {
        name: "Ejercicio",
        reps: "",
        duration: 5,
        instructions: [],
      };

    $("#exerciseTitle").textContent = routine.name;
    $("#exerciseDay").textContent = `Día ${dayIndex + 1}`;
    $("#currentExerciseName").textContent = day.name;
    $("#currentExerciseReps").textContent = day.reps || "";
    $("#exerciseDuration").textContent = (day.duration || 5) + " min";

    const ul = $("#exerciseInstructions");
    ul.innerHTML = "";
    (day.instructions || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = "• " + t;
      ul.appendChild(li);
    });

    scr.dataset.routineId = routine.id;
    scr.dataset.dayIndex = String(dayIndex);
    scr.dataset.totalDays = String(totalDays);

    scr.classList.remove("hidden");
  }

  async function openRoutineDetails(user, routine) {
    const modal = $("#routineDetailsModal");
    if (!modal) return;

    const progressList = await apiGetProgress();
    const rec = progressList.find((p) => p.routineId === routine.id);

    const totalDays = routine.days?.length || 3;
    let daysDone = rec?.daysDone || [];
    if (daysDone.length < totalDays) {
      daysDone = [
        ...daysDone,
        ...Array.from({ length: totalDays - daysDone.length }, () => false),
      ];
    }

    $("#detailsRoutineName").textContent = routine.name;
    $("#detailsCompletionDate").textContent = rec?.completedDate
      ? new Date(rec.completedDate).toLocaleString()
      : "—";

    const list = $("#exerciseDetailsList");
    list.innerHTML = "";
    (routine.days || []).forEach((d, i) => {
      const doneIcon = daysDone[i] ? "✅" : "⬜";
      const div = document.createElement("div");
      div.className = "p-3 bg-gray-50 rounded";
      div.innerHTML = `<strong>${doneIcon} Día ${i + 1}:</strong> ${
        d.name
      } — ${d.reps} (${d.duration} min)`;
      list.appendChild(div);
    });

    modal.classList.remove("hidden");
  }

  // ===================== Modal: seleccionar y asignar rutinas =====================
  function setupSelectRoutine(user) {
    const modal = $("#routineModal");
    const grid = $("#availableRoutines");
    const btnOpen = $("#selectRoutineBtn");
    const btnCancel = $("#cancelRoutine");
    if (!modal || !grid || !btnOpen || !btnCancel) return;

    btnOpen.addEventListener("click", async () => {
      try {
        const all = await apiGetAllRoutines();
        grid.innerHTML = "";
        all.forEach((r) => {
          const card = document.createElement("article");
          card.className = "border rounded-lg p-4";
          card.innerHTML = `
            <h4 class="font-medium text-gray-800">${r.name}</h4>
            <p class="text-sm text-gray-500 mb-2">${r.category} · ${
            r.difficulty
          } · ${r.duration} min</p>
            <p class="text-gray-600 mb-4">${r.description}</p>
            <button class="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700" data-id="${
              r.id
            }">
              Asignar a mi cuenta
            </button>
          `;
          grid.appendChild(card);
        });
        modal.classList.remove("hidden");
      } catch (err) {
        console.error(err);
        notify("No se pudo cargar el catálogo de rutinas", "error");
      }
    });

    grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      const routineId = btn.dataset.id;
      try {
        await apiAssignRoutine(routineId);
        notify("Rutina asignada a tu cuenta", "success");
        modal.classList.add("hidden");
        await Promise.all([
          renderPatientRoutines(user),
          refreshProgressDashboard(user),
        ]);
      } catch (err) {
        console.error(err);
        notify("No se pudo asignar la rutina", "error");
      }
    });

    btnCancel.addEventListener("click", () => modal.classList.add("hidden"));
  }

  // ===================== TERAPEUTA: Crear y listar rutinas =====================
  function setupTherapistCreate(user) {
    const openBtn = $("#createRoutineBtn");
    const modal = $("#createRoutineModal");
    const closeA = $("#closeCreateRoutineModal");
    const cancelA = $("#cancelCreateRoutine");
    const form = $("#createRoutineForm");
    const grid = $("#therapistRoutinesGrid");

    if (!openBtn || !modal || !form || !grid) return;

    const counters = {
      created: $("#therapistRoutinesCount"),
      activePatients: $("#activePatientsCount"),
      completed: $("#completedTherapistRoutines"),
      successRate: $("#successRate"),
    };

    async function refreshList() {
      try {
        const all = await apiGetAllRoutines();
        const mine = all.filter((r) => r.ownerId === user.id);
        grid.innerHTML = "";
        mine.forEach((r) => {
          const card = document.createElement("article");
          card.className = "bg-white rounded-lg border p-5";
          card.innerHTML = `
            <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
            <p class="text-sm text-gray-500 mb-2">${r.category} · ${
            r.difficulty
          } · ${r.duration} min</p>
            <p class="text-gray-600">${r.description}</p>
          `;
          grid.appendChild(card);
        });

        counters.created.textContent = mine.length;
        // Estos podrías calcularlos de verdad si quieres
        counters.activePatients.textContent = 0;
        counters.completed.textContent = 0;
        counters.successRate.textContent = "0%";
      } catch (err) {
        console.error(err);
        notify("No se pudieron cargar tus rutinas como terapeuta", "error");
      }
    }

    openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeA?.addEventListener("click", () => modal.classList.add("hidden"));
    cancelA?.addEventListener("click", () => modal.classList.add("hidden"));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#routineName")?.value.trim();
      const category = $("#routineCategory")?.value;
      const difficulty = $("#routineDifficulty")?.value;
      const duration = parseInt($("#routineDuration")?.value || "0", 10);
      const description = $("#routineDescription")?.value.trim();

      const days = [
        {
          name: $("#exercise1Name")?.value.trim(),
          reps: $("#exercise1Reps")?.value.trim(),
          duration: parseInt($("#exercise1Duration")?.value || "0", 10),
          instructions: [],
        },
        {
          name: $("#exercise2Name")?.value.trim(),
          reps: $("#exercise2Reps")?.value.trim(),
          duration: parseInt($("#exercise2Duration")?.value || "0", 10),
          instructions: [],
        },
        {
          name: $("#exercise3Name")?.value.trim(),
          reps: $("#exercise3Reps")?.value.trim(),
          duration: parseInt($("#exercise3Duration")?.value || "0", 10),
          instructions: [],
        },
      ];

      if (!name || !category || !difficulty || !duration) {
        return notify("Completa los campos obligatorios", "error");
      }

      try {
        await apiCreateRoutine({
          name,
          category,
          difficulty,
          duration,
          description,
          days,
        });
        notify("Rutina creada", "success");
        modal.classList.add("hidden");
        form.reset();
        await refreshList();
      } catch (err) {
        console.error(err);
        notify("Error al crear la rutina", "error");
      }
    });

    refreshList();
  }

  // ===================== PROGRESO: Estadísticas y gráfica =====================
  async function refreshProgressDashboard(user) {
    if (!user) return;

    try {
      const [assigned, progressList] = await Promise.all([
        apiGetAssigned(),
        apiGetProgress(),
      ]);

      const totalR = assigned.length;
      let completedR = 0;
      let exercisesCount = 0;
      const activeDaySet = new Set();

      progressList.forEach((rec) => {
        const totalDays = rec.daysDone?.length || 0;
        if (totalDays && rec.daysDone.every(Boolean)) completedR += 1;
        exercisesCount += rec.history?.length || 0;
        (rec.history || []).forEach((h) => activeDaySet.add(h.date));
      });

      const completedSpan = $("#completedRoutines");
      const completedBar = $("#completedProgress");
      if (completedSpan) completedSpan.textContent = `${completedR}/${totalR}`;
      const pct = totalR ? Math.round((completedR / totalR) * 100) : 0;
      if (completedBar) completedBar.style.width = `${pct}%`;

      $("#exercisesCount").textContent = String(exercisesCount);
      $("#activeDays").textContent = String(activeDaySet.size);

      renderWeeklyChart(progressList);
    } catch (err) {
      console.error(err);
      notify("No se pudo actualizar tu progreso", "error");
    }
  }

  function renderWeeklyChart(progressList) {
    const cvs = $("#progressChart");
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width,
      H = cvs.height;

    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const counts = Array(7).fill(0);
    progressList.forEach((rec) => {
      (rec.history || []).forEach((h) => {
        const idx = days.indexOf(h.date);
        if (idx >= 0) counts[idx] += 1;
      });
    });

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    const padding = 30;
    const chartW = W - padding * 2;
    const chartH = H - padding * 2;

    const maxV = Math.max(1, ...counts);
    const barW = (chartW / counts.length) * 0.6;
    const gap = (chartW / counts.length) * 0.4;

    const dayNames = ["L", "M", "X", "J", "V", "S", "D"];
    for (let i = 0; i < counts.length; i++) {
      const x = padding + i * (barW + gap) + gap / 2 + barW / 2;
      ctx.textAlign = "center";
      const d = new Date(days[i]);
      ctx.fillText(
        dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1],
        x,
        H - 8
      );
    }

    for (let i = 0; i < counts.length; i++) {
      const val = counts[i];
      const h = (val / maxV) * (chartH - 10);
      const x = padding + i * (barW + gap) + gap / 2;
      const y = H - padding - h;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.fillText(String(val), x + barW / 2, y - 4);
    }

    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(padding - 6, padding - 6, chartW + 12, chartH + 12);
  }

  // ===================== Botones comunes =====================
  function wireCommon(currentUser) {
    $("#logoutBtn")?.addEventListener("click", () => {
      clearSession();
      notify("Sesión cerrada", "success");
      setTimeout(() => (window.location.href = LOGIN_PATH), 200);
    });

    $("#closeDetailsBtn")?.addEventListener("click", () =>
      $("#routineDetailsModal")?.classList.add("hidden")
    );
    $("#closeDetailsModal")?.addEventListener("click", () =>
      $("#routineDetailsModal")?.classList.add("hidden")
    );
    $("#cancelExercise")?.addEventListener("click", () =>
      $("#exerciseScreen")?.classList.add("hidden")
    );

    // Handler único para "Completar ejercicio"
    $("#completeExercise")?.addEventListener("click", async () => {
      const scr = $("#exerciseScreen");
      const routineId = scr?.dataset.routineId;
      const dayIndex = Number(scr?.dataset.dayIndex || "0");
      const totalDays = Number(scr?.dataset.totalDays || "3");

      if (!routineId) {
        scr.classList.add("hidden");
        return;
      }

      try {
        const assigned = await apiGetAssigned();
        const routine = assigned.find((r) => r.id === routineId);
        const exerciseName = routine?.days?.[dayIndex]?.name || "";

        await apiMarkProgress({
          routineId,
          dayIndex,
          totalDays,
          exerciseName,
        });

        scr.classList.add("hidden");

        await Promise.all([
          renderPatientRoutines(currentUser),
          refreshProgressDashboard(currentUser),
        ]);

        notify("¡Ejercicio completado!", "success");
      } catch (err) {
        console.error(err);
        notify("No se pudo registrar el ejercicio", "error");
      }
    });

    // Delegación de eventos para los botones "Continuar / Detalles"
    const routinesGrid = $("#routinesGrid");
    if (routinesGrid) {
      routinesGrid.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = btn.dataset.id;
        try {
          const assigned = await apiGetAssigned();
          const routine = assigned.find((r) => r.id === id);
          if (!routine) return;

          if (btn.dataset.act === "start") {
            await openExerciseScreen(currentUser, routine);
          } else if (btn.dataset.act === "details") {
            await openRoutineDetails(currentUser, routine);
          }
        } catch (err) {
          console.error(err);
          notify("No se pudo procesar la rutina", "error");
        }
      });
    }
  }

  // ===================== INIT =====================
  let currentUser = null;
  document.addEventListener("DOMContentLoaded", async () => {
    currentUser = requireSession();
    if (!currentUser) return;

    const welcome = $("#userWelcome");
    if (welcome)
      welcome.textContent = currentUser.name
        ? `Hola, ${currentUser.name}`
        : currentUser.email || "";

    const role = (currentUser.role || "patient").toLowerCase();
    buildTabs(role, currentUser);
    wireCommon(currentUser);

    if (role === "patient") {
      setupSelectRoutine(currentUser);
      await renderPatientRoutines(currentUser);
      await refreshProgressDashboard(currentUser);
    } else if (role === "therapist") {
      setupTherapistCreate(currentUser);
    }

    notify(
      `Sesión iniciada como ${role === "patient" ? "Paciente" : "Terapeuta"}`,
      "success"
    );
  });
})();


