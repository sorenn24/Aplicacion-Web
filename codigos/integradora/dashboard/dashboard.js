// dashboard.js — Rutinas y progreso usando API (sin localStorage para rutinas)
(function () {
  "use strict";

  // ========= Helpers DOM =========
  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

 // ========= API base =========
// BACKEND hospedado en Render (Node + Mongo)
const API_BASE     = "https://medihom-web.onrender.com";
const API_AUTH     = `${API_BASE}/api/auth`;
const API_ROUTINES = `${API_BASE}/api/routines`;


  const STORAGE_CURRENT = "currentUser";
  const STORAGE_TOKEN   = "auth_token";

  // ========= Notificaciones =========
  function notify(msg, type = "info") {
    const box = $("#notifications");
    if (!box) { console.log(`[${type}]`, msg); return; }
    const el = document.createElement("div");
    el.className =
      "px-4 py-3 rounded-xl shadow text-white text-sm " +
      (type === "error"   ? "bg-red-500" :
       type === "success" ? "bg-green-600" :
                            "bg-gray-800");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ========= Sesión =========
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

  // ========= Fetch autenticado =========
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    return res;
  }

  // ========= API Rutinas =========
  async function apiGetAllRoutines() {
    const res = await authFetch(`${API_ROUTINES}`);
    if (!res.ok) throw new Error("No se pudieron cargar las rutinas");
    const data = await res.json().catch(() => ({}));

    // Permitimos que sea un array directo o { routines:[...] }
    const list = Array.isArray(data) ? data : (data.routines || []);
    return list;
  }

  async function apiGetAssigned() {
    const res = await authFetch(`${API_ROUTINES}/assigned`);
    if (!res.ok) throw new Error("No se pudieron cargar las rutinas asignadas");
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : (data.assigned || []);
    return list;
  }

  async function apiAssignRoutine(routineId) {
    const res = await authFetch(`${API_ROUTINES}/assign`, {
      method: "POST",
      body: JSON.stringify({ routineId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "No se pudo asignar la rutina");
    }
    return res.json().catch(() => ({}));
  }

  async function apiMarkDayDone(assignedId, dayIndex) {
    const res = await authFetch(`${API_ROUTINES}/progress`, {
      method: "POST",
      body: JSON.stringify({ assignedId, dayIndex }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "No se pudo guardar el progreso");
    }
    return res.json().catch(() => ({}));
  }

  // ========= Progreso helper =========
  function nextPendingDayIndex(daysDone) {
    const i = daysDone.findIndex(v => !v);
    return i === -1 ? daysDone.length - 1 : i;
  }

  // ========= UI: Tabs por rol =========
  const ROLE_TABS = {
    patient: [
      { id: "routinesSection",  label: "Rutinas" },
      { id: "progressSection",  label: "Progreso" },
      { id: "profileSection",   label: "Perfil" },
      { id: "supportSection",   label: "Soporte" }
    ],
    therapist: [
      { id: "therapistSection", label: "Panel Terapeuta" },
      { id: "profileSection",   label: "Perfil" },
      { id: "supportSection",   label: "Soporte" }
    ]
  };

  function buildTabs(role, currentUser) {
    const tabs = ROLE_TABS[role] || ROLE_TABS.patient;
    const nav  = $("#navigationTabs");
    if (!nav) return;
    nav.innerHTML = "";

    tabs.forEach((t, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "px-3 py-2 text-sm border-b-2 border-transparent hover:border-blue-500";
      btn.textContent = t.label;
      btn.dataset.target = t.id;
      btn.addEventListener("click", () => {
        $$("#navigationTabs button").forEach(b =>
          b.classList.remove("border-blue-600", "text-blue-600")
        );
        btn.classList.add("border-blue-600", "text-blue-600");
        $$(".section").forEach(s => s.classList.add("hidden"));
        document.getElementById(t.id)?.classList.remove("hidden");
        if (t.id === "progressSection") refreshProgressDashboard(currentUser);
      });
      nav.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  // ========= PACIENTE: Rutinas =========

  // Guardamos en memoria las rutinas asignadas para poder buscarlas
  let gAssignedWithRoutines = [];

  async function renderPatientRoutines(currentUser) {
    const routinesGrid = $("#routinesGrid");
    if (!routinesGrid) return;

    try {
      const [catalog, assigned] = await Promise.all([
        apiGetAllRoutines(),
        apiGetAssigned()
      ]);

      // Normalizar catálogo usando id consistente
      const normalizedCatalog = catalog.map(r => ({
        id: r._id || r.id,
        name: r.name || r.title || "Rutina sin nombre",
        category: r.category || "General",
        difficulty: r.difficulty || "Principiante",
        duration: r.duration || 0,
        description: r.description || "",
        days: r.days || r.exercises || []
      }));

      // Unir assigned + catálogo
      gAssignedWithRoutines = assigned
        .map(a => {
          const assignedId = a._id || a.id || a.assignedId;
          const routineId  = a.routineId || a.routine_id || a.routine?.id || a.routine?._id;
          const base = normalizedCatalog.find(r => r.id === routineId);

          if (!base) return null;

          const prog = a.progress || {};
          const daysDone = Array.isArray(prog.daysDone)
            ? prog.daysDone
            : Array.from({ length: base.days.length }, () => false);

          return {
            assignedId,
            routineId,
            userId: a.userId || a.user_id,
            ...base,
            progress: {
              daysDone,
              completedDate: prog.completedDate || null,
              history: prog.history || []
            }
          };
        })
        .filter(Boolean); // quita los null (por si falta alguna rutina en catalog)

      routinesGrid.innerHTML = "";

      if (!gAssignedWithRoutines.length) {
        routinesGrid.innerHTML = `
          <div class="col-span-1 md:col-span-2 lg:col-span-3">
            <div class="bg-white rounded-lg border p-6 text-gray-600">
              Aún no tienes rutinas asignadas. Usa “+ Seleccionar Rutina”.
            </div>
          </div>`;
        return;
      }

      gAssignedWithRoutines.forEach(r => {
        const total = r.days.length || 0;
        const done  = r.progress.daysDone.filter(Boolean).length;
        const pct   = total ? Math.round((done / total) * 100) : 0;

        const card = document.createElement("article");
        card.className = "bg-white rounded-lg card-minimal p-5 border mb-4";
        card.innerHTML = `
          <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
          <p class="text-sm text-gray-500 mb-2">
            ${r.category} · ${r.difficulty} · ${r.duration || 0} min
          </p>
          <p class="text-gray-600 mb-4">${r.description}</p>

          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progreso</span><span>${done}/${total} (${pct}%)</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-500 h-2 rounded-full" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
              data-act="start" data-assigned-id="${r.assignedId}">
              ${done < total ? "Continuar" : "Revisar"}
            </button>
            <button
              class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200"
              data-act="details" data-assigned-id="${r.assignedId}">
              Detalles
            </button>
          </div>
        `;
        routinesGrid.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      notify("Error al cargar tus rutinas", "error");
    }

    // Delegación de eventos (usar el array global gAssignedWithRoutines)
    routinesGrid.onclick = (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      const assignedId = btn.dataset.assignedId;
      const item = gAssignedWithRoutines.find(x => x.assignedId === assignedId);
      if (!item) return;

      if (btn.dataset.act === "start") {
        openExerciseScreen(item);
      } else if (btn.dataset.act === "details") {
        openRoutineDetails(item);
      }
    };
  }

  function openExerciseScreen(assignedItem) {
    const scr = $("#exerciseScreen");
    if (!scr) return;

    const { name, days, progress } = assignedItem;
    const daysDone = progress.daysDone.length
      ? progress.daysDone
      : Array.from({ length: days.length }, () => false);

    const dayIndex = nextPendingDayIndex(daysDone);
    const d = days[dayIndex] || {
      name: "Ejercicio",
      reps: "",
      duration: 5,
      instructions: [],
    };

    $("#exerciseTitle").textContent = name;
    $("#exerciseDay").textContent   = `Día ${dayIndex + 1}`;
    $("#currentExerciseName").textContent = d.name || "";
    $("#currentExerciseReps").textContent = d.reps || "";
    $("#exerciseDuration").textContent    = (d.duration || 5) + " min";

    const ul = $("#exerciseInstructions");
    ul.innerHTML = "";
    (d.instructions || []).forEach(t => {
      const li = document.createElement("li");
      li.textContent = "• " + t;
      ul.appendChild(li);
    });

    // Guardar en dataset para "Completar Ejercicio"
    scr.dataset.assignedId = assignedItem.assignedId;
    scr.dataset.dayIndex   = String(dayIndex);

    scr.classList.remove("hidden");
  }

  function openRoutineDetails(assignedItem) {
    const modal = $("#routineDetailsModal");
    if (!modal) return;

    const { name, days, progress } = assignedItem;
    const daysDone = progress.daysDone || [];

    $("#detailsRoutineName").textContent = name;
    $("#detailsCompletionDate").textContent = progress.completedDate
      ? new Date(progress.completedDate).toLocaleString()
      : "—";

    const list = $("#exerciseDetailsList");
    list.innerHTML = "";
    (days || []).forEach((d, i) => {
      const doneIcon = daysDone[i] ? "✅" : "⬜";
      const div = document.createElement("div");
      div.className = "p-3 bg-gray-50 rounded";
      div.innerHTML =
        `<strong>${doneIcon} Día ${i + 1}:</strong> ` +
        `${d.name || ""} — ${d.reps || ""} (${d.duration || 0} min)`;
      list.appendChild(div);
    });

    modal.classList.remove("hidden");
  }

  // Modal: seleccionar y asignar rutinas
  async function setupSelectRoutine() {
    const modal    = $("#routineModal");
    const grid     = $("#availableRoutines");
    const btnOpen  = $("#selectRoutineBtn");
    const btnClose = $("#cancelRoutine");
    if (!modal || !grid || !btnOpen || !btnClose) return;

    btnOpen.addEventListener("click", async () => {
      try {
        const catalog = await apiGetAllRoutines();
        grid.innerHTML = "";

        catalog.forEach(raw => {
          const r = {
            id: raw._id || raw.id,
            name: raw.name || raw.title || "Rutina sin nombre",
            category: raw.category || "General",
            difficulty: raw.difficulty || "Principiante",
            duration: raw.duration || 0,
            description: raw.description || "",
          };

          const card = document.createElement("article");
          card.className = "border rounded-lg p-4";
          card.innerHTML = `
            <h4 class="font-medium text-gray-800">${r.name}</h4>
            <p class="text-sm text-gray-500 mb-2">
              ${r.category} · ${r.difficulty} · ${r.duration} min
            </p>
            <p class="text-gray-600 mb-4">${r.description}</p>
            <button
              class="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
              data-id="${r.id}">
              Asignar a mi cuenta
            </button>
          `;
          grid.appendChild(card);
        });

        modal.classList.remove("hidden");
      } catch (err) {
        console.error(err);
        notify("No se pudieron cargar las rutinas disponibles", "error");
      }
    });

    grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      const id = btn.dataset.id;
      try {
        await apiAssignRoutine(id);
        notify("Rutina asignada a tu cuenta", "success");
        modal.classList.add("hidden");
        await renderPatientRoutines(getCurrentUser());
        await refreshProgressDashboard(getCurrentUser());
      } catch (err) {
        console.error(err);
        notify(err.message || "No se pudo asignar la rutina", "error");
      }
    });

    btnClose.addEventListener("click", () => modal.classList.add("hidden"));
  }

  // ========= PROGRESO: estadísticas y gráfica =========
  async function refreshProgressDashboard(_user) {
    const completedSpan = $("#completedRoutines");
    const completedBar  = $("#completedProgress");
    const exercisesSpan = $("#exercisesCount");
    const activeDaysSpan= $("#activeDays");

    try {
      const [catalog, assigned] = await Promise.all([
        apiGetAllRoutines(),
        apiGetAssigned()
      ]);

      const catMap = new Map(
        catalog.map(r => [ (r._id || r.id), r ])
      );

      let totalR = 0;
      let completedR = 0;
      let exercisesCount = 0;
      const activeDaySet = new Set();
      const allHistory   = [];

      assigned.forEach(a => {
        const prog = a.progress || {};
        const daysDone = prog.daysDone || [];
        const history  = prog.history  || [];

        const routineId = a.routineId || a.routine_id || a.routine?._id || a.routine?.id;
        const base = catMap.get(routineId);
        if (!base) return;

        const totalDays = (base.days || base.exercises || []).length;
        if (!totalDays) return;

        totalR += 1;
        if (daysDone.length && daysDone.every(Boolean)) completedR += 1;

        exercisesCount += history.length;
        history.forEach(h => {
          if (h.date) activeDaySet.add(h.date);
          allHistory.push(h);
        });
      });

      if (completedSpan) completedSpan.textContent = `${completedR}/${totalR}`;
      const pct = totalR ? Math.round((completedR / totalR) * 100) : 0;
      if (completedBar) completedBar.style.width = `${pct}%`;
      if (exercisesSpan) exercisesSpan.textContent = String(exercisesCount);
      if (activeDaysSpan) activeDaysSpan.textContent = String(activeDaySet.size);

      renderWeeklyChart(allHistory);
    } catch (err) {
      console.error(err);
      notify("No se pudo cargar el progreso", "error");
    }
  }

  function renderWeeklyChart(history) {
    const cvs = $("#progressChart");
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width;
    const H = cvs.height;

    // Preparar últimos 7 días
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts = Array(7).fill(0);

    (history || []).forEach(h => {
      const idx = days.indexOf(h.date);
      if (idx >= 0) counts[idx] += 1;
    });

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    const padding = 30;
    const chartW = W - padding * 2;
    const chartH = H - padding * 2;

    const maxV = Math.max(1, ...counts);
    const barW = (chartW / counts.length) * 0.6;
    const gap  = (chartW / counts.length) * 0.4;

    const dayNames = ["L","M","X","J","V","S","D"];
    for (let i = 0; i < counts.length; i++) {
      const x = padding + i * (barW + gap) + gap / 2 + barW / 2;
      ctx.textAlign = "center";
      const d = new Date(days[i]);
      ctx.fillText(dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1], x, H - 8);
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

  // ========= Botones comunes =========
  function wireCommon() {
    $("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_CURRENT);
      localStorage.removeItem(STORAGE_TOKEN);
      notify("Sesión cerrada", "success");
      setTimeout(() => (window.location.href = "/integradora/index.html"), 200);
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

    $("#completeExercise")?.addEventListener("click", async () => {
      const scr = $("#exerciseScreen");
      const assignedId = scr?.dataset.assignedId;
      const dayIndex   = parseInt(scr?.dataset.dayIndex || "0", 10);
      if (!assignedId) {
        scr?.classList.add("hidden");
        return;
      }

      try {
        await apiMarkDayDone(assignedId, dayIndex);
        notify("¡Ejercicio completado!", "success");
        scr.classList.add("hidden");
        await renderPatientRoutines(getCurrentUser());
        await refreshProgressDashboard(getCurrentUser());
      } catch (err) {
        console.error(err);
        notify(err.message || "No se pudo guardar el progreso", "error");
      }
    });
  }

  // ========= Init =========
  document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = "/integradora/index.html";
      return;
    }

    const welcome = $("#userWelcome");
    if (welcome) {
      welcome.textContent = currentUser.name
        ? `Hola, ${currentUser.name}`
        : (currentUser.email || "");
    }

    const role = (currentUser.role || "patient").toLowerCase();

    buildTabs(role, currentUser);
    wireCommon();

    if (role === "patient") {
      await setupSelectRoutine();
      await renderPatientRoutines(currentUser);
      await refreshProgressDashboard(currentUser);
    } else if (role === "therapist") {
      // De momento el panel de terapeuta sigue como antes;
      // si quieres, luego lo conectamos también a la API.
      notify("Panel de terapeuta en construcción con API", "info");
    }

    notify(`Sesión iniciada como ${role === "patient" ? "Paciente" : "Terapeuta"}`, "success");
  });
})();





