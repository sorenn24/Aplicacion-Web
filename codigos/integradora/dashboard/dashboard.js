// dashboard.js — Paciente + Terapeuta con API completa
(function () {
  "use strict";

  // ==========================
  //  Helpers DOM
  // ==========================
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  // ==========================
  //  Notificaciones
  // ==========================
  function notify(msg, type = "info") {
    const box = $("#notifications");
    if (!box) {
      console.log(`[${type}]`, msg);
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

  // ==========================
  //  Sesión y API
  // ==========================
  const STORAGE_CURRENT_USER = "currentUser";
  const TOKEN_KEY = "auth_token";

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function requireSession() {
    const u = getCurrentUser();
    if (!u) {
      window.location.href = "../login/index.html";
      return null;
    }
    return u;
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // En producción estamos usando Render
  const API_BASE = "https://medihom-web.onrender.com/api";
  const API_ROUTINES = `${API_BASE}/routines`;

  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"] && options.body) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status} en ${url}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ==========================
  //  API Rutinas / Progreso
  // ==========================
  let cachedRoutines = [];

  async function apiGetAllRoutines() {
    if (cachedRoutines.length) return cachedRoutines;
    const data = await authFetch(`${API_ROUTINES}`);
    if (Array.isArray(data)) {
      cachedRoutines = data;
    } else if (Array.isArray(data.routines)) {
      cachedRoutines = data.routines;
    } else {
      cachedRoutines = [];
    }
    return cachedRoutines;
  }

  async function apiGetAssignedRoutineIds() {
    const data = await authFetch(`${API_ROUTINES}/assigned`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.assigned)) return data.assigned;
    if (Array.isArray(data.routineIds)) return data.routineIds;
    return [];
  }

  async function apiAssignRoutine(routineId) {
    return authFetch(`${API_ROUTINES}/assign`, {
      method: "POST",
      body: JSON.stringify({ routineId }),
    });
  }

  async function apiGetProgressMap() {
    const arr = await authFetch(`${API_ROUTINES}/progress`);
    const map = new Map();
    if (Array.isArray(arr)) {
      arr.forEach((p) => {
        if (p && p.routineId) {
          map.set(p.routineId, p);
        }
      });
    }
    return map;
  }

  async function apiMarkDayDone(routineId, dayIndex, totalDays, exerciseName) {
    return authFetch(`${API_ROUTINES}/progress`, {
      method: "POST",
      body: JSON.stringify({ routineId, dayIndex, totalDays, exerciseName }),
    });
  }

  // ---- Terapeuta: API extra ----
  async function apiCreateRoutine(payload) {
    return authFetch(`${API_ROUTINES}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function apiUpdateRoutine(id, payload) {
    return authFetch(`${API_ROUTINES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async function apiDeleteRoutine(id) {
    return authFetch(`${API_ROUTINES}/${id}`, {
      method: "DELETE",
    });
  }

  async function apiGetTherapistMetrics() {
    // { createdCount, activePatients, completedRoutines, successRate }
    return authFetch(`${API_ROUTINES}/therapist/metrics`);
  }

  // ==========================
  //  Tabs por rol
  // ==========================
  const ROLE_TABS = {
    patient: [
      { id: "routinesSection", label: "Rutinas" },
      { id: "progressSection", label: "Progreso" },
      { id: "profileSection", label: "Perfil" },
      { id: "supportSection", label: "Soporte" },
    ],
    therapist: [
      { id: "therapistSection", label: "Panel Terapeuta" },
      { id: "progressSection", label: "Progreso" },
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
      btn.addEventListener("click", () => {
        $$("#navigationTabs button").forEach((b) =>
          b.classList.remove("border-blue-600", "text-blue-600")
        );
        btn.classList.add("border-blue-600", "text-blue-600");
        $$(".section").forEach((s) => s.classList.add("hidden"));
        document.getElementById(t.id)?.classList.remove("hidden");
        if (t.id === "progressSection") {
          refreshProgressDashboard(currentUser);
        } else if (t.id === "therapistSection") {
          refreshTherapistDashboard(currentUser);
        }
      });
      nav.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  // ==========================
  //  PACIENTE: Rutinas
  // ==========================
  function routineIdOf(r) {
    return r._id || r.id || r.routineId;
  }

  async function renderPatientRoutines(user) {
    const routinesGrid = $("#routinesGrid");
    if (!routinesGrid) return;

    routinesGrid.innerHTML = `
      <div class="col-span-1 md:col-span-2 lg:col-span-3">
        <div class="bg-white rounded-lg border p-6 text-gray-600">
          Cargando tus rutinas...
        </div>
      </div>`;

    try {
      const [all, assignedIds, progressMap] = await Promise.all([
        apiGetAllRoutines(),
        apiGetAssignedRoutineIds(),
        apiGetProgressMap(),
      ]);

      const assignedSet = new Set(assignedIds);
      const myRoutines = all.filter((r) => assignedSet.has(routineIdOf(r)));

      routinesGrid.innerHTML = "";

      if (!myRoutines.length) {
        routinesGrid.innerHTML = `
          <div class="col-span-1 md:col-span-2 lg:col-span-3">
            <div class="bg-white rounded-lg border p-6 text-gray-600">
              Aún no tienes rutinas asignadas. Usa “+ Seleccionar Rutina”.
            </div>
          </div>`;
        return;
      }

      myRoutines.forEach((r) => {
        const rid = routineIdOf(r);
        const prog = progressMap.get(rid) || {};
        const total = r.days?.length || 3;

        const daysDone = Array.isArray(prog.daysDone)
          ? prog.daysDone
          : Array.from({ length: total }, () => false);

        const done = daysDone.filter(Boolean).length;
        const pct = total ? Math.round((done / total) * 100) : 0;

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
              <div class="bg-green-500 h-2 rounded-full" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
                    data-act="start" data-id="${rid}">
              ${done < total ? "Continuar" : "Revisar"}
            </button>
            <button class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200"
                    data-act="details" data-id="${rid}">
              Detalles
            </button>
          </div>
        `;
        routinesGrid.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      notify("No se pudieron cargar tus rutinas", "error");
      routinesGrid.innerHTML = `
        <div class="col-span-1 md:col-span-2 lg:col-span-3">
          <div class="bg-white rounded-lg border p-6 text-red-600">
            Error al cargar rutinas.
          </div>
        </div>`;
      return;
    }

    // Delegación de eventos para botones
    routinesGrid.onclick = async (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      const id = btn.dataset.id;
      const all = await apiGetAllRoutines();
      const routine = all.find((r) => routineIdOf(r) === id);
      if (!routine) return;

      const progressMap = await apiGetProgressMap();
      const prog = progressMap.get(id);

      if (btn.dataset.act === "start") {
        openExerciseScreen(routine, prog);
      } else if (btn.dataset.act === "details") {
        openRoutineDetails(routine, prog);
      }
    };
  }

  function getNextDayIndex(routine, progressRecord) {
    const total = routine.days?.length || 0;
    const daysDone =
      progressRecord && Array.isArray(progressRecord.daysDone)
        ? progressRecord.daysDone
        : Array.from({ length: total }, () => false);

    const idx = daysDone.findIndex((d) => !d);
    return idx === -1 ? total - 1 : idx;
  }

  function openExerciseScreen(routine, progressRecord) {
    const scr = $("#exerciseScreen");
    if (!scr) return;

    const dayIndex = getNextDayIndex(routine, progressRecord);
    const day = routine.days?.[dayIndex] || {};

    $("#exerciseTitle").textContent = routine.name;
    $("#exerciseDay").textContent = `Día ${dayIndex + 1}`;
    $("#currentExerciseName").textContent = day.name || "";
    $("#currentExerciseReps").textContent = day.reps || "";
    $("#exerciseDuration").textContent = (day.duration || 5) + " min";

    const ul = $("#exerciseInstructions");
    ul.innerHTML = "";
    (day.instructions || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = "• " + t;
      ul.appendChild(li);
    });

    scr.dataset.routineId = routineIdOf(routine);
    scr.dataset.dayIndex = String(dayIndex);
    scr.classList.remove("hidden");
  }

  async function openRoutineDetails(routine, progressRecord) {
    const modal = $("#routineDetailsModal");
    if (!modal) return;

    const total = routine.days?.length || 0;
    const prog =
      progressRecord ||
      { daysDone: Array(total).fill(false), completedAt: null };

    $("#detailsRoutineName").textContent = routine.name;
    $("#detailsCompletionDate").textContent = prog.completedAt
      ? new Date(prog.completedAt).toLocaleString()
      : "—";

    const list = $("#exerciseDetailsList");
    list.innerHTML = "";

    const daysDone = Array.isArray(prog.daysDone)
      ? prog.daysDone
      : Array.from({ length: total }, () => false);

    (routine.days || []).forEach((d, i) => {
      const doneIcon = daysDone[i] ? "✅" : "⬜";
      const div = document.createElement("div");
      div.className = "p-3 bg-gray-50 rounded";
      div.innerHTML = `<strong>${doneIcon} Día ${
        i + 1
      }:</strong> ${d.name} — ${d.reps} (${d.duration} min)`;
      list.appendChild(div);
    });

    modal.classList.remove("hidden");
  }

  // ==========================
  //  Modal seleccionar rutina (Paciente)
  // ==========================
  function setupSelectRoutine(user) {
    const modal = $("#routineModal");
    const grid = $("#availableRoutines");
    const btnOpen = $("#selectRoutineBtn");
    const btnCancel = $("#cancelRoutine");
    if (!modal || !grid || !btnOpen || !btnCancel) return;

    btnOpen.addEventListener("click", async () => {
      try {
        const [all, assignedIds] = await Promise.all([
          apiGetAllRoutines(),
          apiGetAssignedRoutineIds(),
        ]);
        const assignedSet = new Set(assignedIds);

        grid.innerHTML = "";
        all.forEach((r) => {
          const id = routineIdOf(r);
          const yaTiene = assignedSet.has(id);
          const card = document.createElement("article");
          card.className = "border rounded-lg p-4";
          card.innerHTML = `
            <h4 class="font-medium text-gray-800">${r.name}</h4>
            <p class="text-sm text-gray-500 mb-2">${r.category} · ${
            r.difficulty
          } · ${r.duration} min</p>
            <p class="text-gray-600 mb-4">${r.description}</p>
            <button class="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
                    data-id="${id}" ${yaTiene ? "disabled" : ""}>
              ${yaTiene ? "Ya asignada" : "Asignar a mi cuenta"}
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
      if (!btn || btn.disabled) return;
      const routineId = btn.dataset.id;

      try {
        await apiAssignRoutine(routineId);
        notify("Rutina asignada a tu cuenta", "success");
        modal.classList.add("hidden");
        cachedRoutines = [];
        await renderPatientRoutines(user);
        await refreshProgressDashboard(user);
      } catch (err) {
        console.error(err);
        notify("Error al asignar rutina", "error");
      }
    });

    btnCancel.addEventListener("click", () => modal.classList.add("hidden"));
  }

  // ==========================
  //  Terapeuta: panel (crear / editar / borrar / métricas)
  // ==========================
  let editingRoutineId = null;

  async function refreshTherapistDashboard(user) {
    const grid = $("#therapistRoutinesGrid");
    const cCreated = $("#therapistRoutinesCount");
    const cActive = $("#activePatientsCount");
    const cCompleted = $("#completedTherapistRoutines");
    const cSuccess = $("#successRate");

    if (!grid || !cCreated) return;

    try {
      const [all, metrics] = await Promise.all([
        apiGetAllRoutines(),
        apiGetTherapistMetrics().catch(() => null),
      ]);

      const uid = user._id || user.id || user.email;
      const mine = all.filter(
        (r) =>
          r.ownerId === uid ||
          r.owner === uid ||
          r.ownerId === (user._id || user.id)
      );

      grid.innerHTML = "";
      mine.forEach((r) => {
        const card = document.createElement("article");
        card.className = "bg-white rounded-lg border p-5 flex flex-col justify-between";
        card.innerHTML = `
          <div>
            <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
            <p class="text-sm text-gray-500 mb-2">${r.category} · ${
          r.difficulty
        } · ${r.duration} min</p>
            <p class="text-gray-600 mb-4">${r.description}</p>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700"
                    data-act="edit" data-id="${routineIdOf(r)}">
              Editar
            </button>
            <button class="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600"
                    data-act="delete" data-id="${routineIdOf(r)}">
              Eliminar
            </button>
          </div>
        `;
        grid.appendChild(card);
      });

      cCreated.textContent = String(mine.length);

      if (metrics) {
        cActive.textContent = String(metrics.activePatients ?? 0);
        cCompleted.textContent = String(metrics.completedRoutines ?? 0);
        cSuccess.textContent = `${metrics.successRate ?? 0}%`;
      } else {
        cActive.textContent = "0";
        cCompleted.textContent = "0";
        cSuccess.textContent = "0%";
      }
    } catch (err) {
      console.error(err);
      notify("No se pudo cargar el panel de terapeuta", "error");
    }
  }

  function setupTherapistCreate(user) {
    const openBtn = $("#createRoutineBtn");
    const modal = $("#createRoutineModal");
    const closeBtn = $("#closeCreateRoutineModal");
    const cancelBtn = $("#cancelCreateRoutine");
    const form = $("#createRoutineForm");
    const titleEl = modal?.querySelector("h3");
    const submitBtn = form?.querySelector('button[type="submit"]');

    if (!openBtn || !modal || !form) return;

    function resetForm() {
      form.reset();
      editingRoutineId = null;
      if (titleEl)
        titleEl.textContent = "Crear Nueva Rutina de Rehabilitación";
      if (submitBtn) submitBtn.textContent = "Crear Rutina";
    }

    openBtn.addEventListener("click", () => {
      resetForm();
      modal.classList.remove("hidden");
    });

    closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
    cancelBtn?.addEventListener("click", () => modal.classList.add("hidden"));

    // Click en editar / eliminar dentro del grid
    const grid = $("#therapistRoutinesGrid");
    if (grid) {
      grid.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = btn.dataset.id;

        const all = await apiGetAllRoutines();
        const routine = all.find((r) => routineIdOf(r) === id);
        if (!routine) return;

        if (btn.dataset.act === "edit") {
          // Rellenar formulario
          editingRoutineId = id;
          if (titleEl) titleEl.textContent = "Editar Rutina";
          if (submitBtn) submitBtn.textContent = "Guardar Cambios";

          $("#routineName").value = routine.name || "";
          $("#routineCategory").value = routine.category || "";
          $("#routineDifficulty").value = routine.difficulty || "";
          $("#routineDuration").value = routine.duration || "";
          $("#routineDescription").value = routine.description || "";

          const d1 = routine.days?.[0] || {};
          const d2 = routine.days?.[1] || {};
          const d3 = routine.days?.[2] || {};
          $("#exercise1Name").value = d1.name || "";
          $("#exercise1Reps").value = d1.reps || "";
          $("#exercise1Duration").value = d1.duration || "";
          $("#exercise2Name").value = d2.name || "";
          $("#exercise2Reps").value = d2.reps || "";
          $("#exercise2Duration").value = d2.duration || "";
          $("#exercise3Name").value = d3.name || "";
          $("#exercise3Reps").value = d3.reps || "";
          $("#exercise3Duration").value = d3.duration || "";

          modal.classList.remove("hidden");
        } else if (btn.dataset.act === "delete") {
          if (!confirm("¿Eliminar esta rutina? También se borrará el progreso asociado.")) {
            return;
          }
          try {
            await apiDeleteRoutine(id);
            notify("Rutina eliminada", "success");
            cachedRoutines = [];
            await refreshTherapistDashboard(user);
          } catch (err) {
            console.error(err);
            notify("No se pudo eliminar la rutina", "error");
          }
        }
      });
    }

    // Crear / editar rutina
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        name: $("#routineName").value.trim(),
        category: $("#routineCategory").value,
        difficulty: $("#routineDifficulty").value,
        duration: Number($("#routineDuration").value) || 0,
        description: $("#routineDescription").value.trim(),
        days: [
          {
            name: $("#exercise1Name").value.trim(),
            reps: $("#exercise1Reps").value.trim(),
            duration: Number($("#exercise1Duration").value) || 0,
          },
          {
            name: $("#exercise2Name").value.trim(),
            reps: $("#exercise2Reps").value.trim(),
            duration: Number($("#exercise2Duration").value) || 0,
          },
          {
            name: $("#exercise3Name").value.trim(),
            reps: $("#exercise3Reps").value.trim(),
            duration: Number($("#exercise3Duration").value) || 0,
          },
        ],
      };

      try {
        if (editingRoutineId) {
          await apiUpdateRoutine(editingRoutineId, payload);
          notify("Rutina actualizada correctamente", "success");
        } else {
          await apiCreateRoutine(payload);
          notify("Rutina creada correctamente", "success");
        }

        modal.classList.add("hidden");
        cachedRoutines = [];
        await refreshTherapistDashboard(user);
      } catch (err) {
        console.error(err);
        notify("No se pudo guardar la rutina", "error");
      }
    });
  }

  // ==========================
  //  PROGRESO (paciente)
  // ==========================
  async function refreshProgressDashboard(user) {
    if (!user) return;

    try {
      const [all, assignedIds, progressMap] = await Promise.all([
        apiGetAllRoutines(),
        apiGetAssignedRoutineIds(),
        apiGetProgressMap(),
      ]);

      const assignedSet = new Set(assignedIds);
      const myRoutines = all.filter((r) => assignedSet.has(routineIdOf(r)));

      const totalR = myRoutines.length;
      const completedR = myRoutines.filter((r) => {
        const rec = progressMap.get(routineIdOf(r));
        if (!rec) return false;
        if (Array.isArray(rec.daysDone)) {
          const arr = rec.daysDone;
          return arr.length && arr.every((v) => v === true || v === 1);
        }
        return !!rec.completed;
      }).length;

      const completedSpan = $("#completedRoutines");
      const completedBar = $("#completedProgress");
      if (completedSpan) completedSpan.textContent = `${completedR}/${totalR}`;
      const pct = totalR ? Math.round((completedR / totalR) * 100) : 0;
      if (completedBar) completedBar.style.width = `${pct}%`;

      let exercisesCount = 0;
      const activeDaySet = new Set();
      progressMap.forEach((rec) => {
        if (Array.isArray(rec.history)) {
          exercisesCount += rec.history.length;
          rec.history.forEach((h) => h.date && activeDaySet.add(h.date));
        }
      });
      $("#exercisesCount").textContent = String(exercisesCount);
      $("#activeDays").textContent = String(activeDaySet.size);

      renderWeeklyChart(progressMap);
    } catch (err) {
      console.error(err);
      notify("No se pudo cargar tu progreso", "error");
    }
  }

  function renderWeeklyChart(progressMap) {
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

    progressMap.forEach((rec) => {
      (rec.history || []).forEach((h) => {
        if (!h.date) return;
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

  // ==========================
  //  Botones comunes
  // ==========================
  function wireCommon(currentUser) {
    $("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_CURRENT_USER);
      localStorage.removeItem(TOKEN_KEY);
      notify("Sesión cerrada", "success");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 200);
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
      const rid = scr?.dataset.routineId;
      const dayIndex = parseInt(scr?.dataset.dayIndex || "0", 10);
      if (!rid) {
        $("#exerciseScreen")?.classList.add("hidden");
        return;
      }

      try {
        const all = await apiGetAllRoutines();
        const routine = all.find((r) => routineIdOf(r) === rid);
        if (!routine) {
          $("#exerciseScreen")?.classList.add("hidden");
          return;
        }

        const totalDays = routine.days?.length || 3;
        const day = routine.days?.[dayIndex] || {};
        await apiMarkDayDone(
          rid,
          dayIndex,
          totalDays,
          day.name || `Día ${dayIndex + 1}`
        );
        $("#exerciseScreen")?.classList.add("hidden");
        await renderPatientRoutines(currentUser);
        await refreshProgressDashboard(currentUser);
        notify("¡Ejercicio completado!", "success");
      } catch (err) {
        console.error(err);
        notify("Error al guardar el ejercicio", "error");
      }
    });
  }

  // ==========================
  //  Init
  // ==========================
  let currentUser = null;

  document.addEventListener("DOMContentLoaded", async () => {
    currentUser = requireSession();
    if (!currentUser) return;

    const welcome = $("#userWelcome");
    if (welcome) {
      welcome.textContent = currentUser.name
        ? `Hola, ${currentUser.name}`
        : currentUser.email || "";
    }

    const role = (currentUser.role || "patient").toLowerCase();
    buildTabs(role, currentUser);
    wireCommon(currentUser);

    if (role === "patient") {
      setupSelectRoutine(currentUser);
      await renderPatientRoutines(currentUser);
      await refreshProgressDashboard(currentUser);
    } else if (role === "therapist") {
      setupTherapistCreate(currentUser);
      await refreshTherapistDashboard(currentUser);
      await refreshProgressDashboard(currentUser); // opcional, para ver su propio progreso si usara la app
    }

    notify(
      `Sesión iniciada como ${
        role === "patient" ? "Paciente" : "Terapeuta"
      }`,
      "success"
    );
  });
})();
