// dashboard.js — paciente + terapeuta usando API en Render (MongoDB)
(function () {
  "use strict";

  // ================= API & sesión =================
  const API_BASE     = "https://medihom-web.onrender.com";
  const API_AUTH     = `${API_BASE}/api/auth`;
  const API_ROUTINES = `${API_BASE}/api/routines`;

  const STORAGE_CURRENT = "currentUser";
  const STORAGE_TOKEN   = "auth_token";

  const LOGIN_PATH = "../login/index.html";

  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
  }
  function requireSession() {
    const u = getCurrentUser();
    if (!u || !getToken()) {
      window.location.href = LOGIN_PATH;
      return null;
    }
    return u;
  }

  // ================= Notificaciones =================
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

  // ================= Fetch con token =================
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(url, { ...options, headers, credentials: "include" });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `Error HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ================= API: rutinas & progreso =================
  async function apiGetAllRoutines() {
    const data = await authFetch(`${API_ROUTINES}`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.routines)) return data.routines;
    if (data && Array.isArray(data.available)) return data.available;
    return [];
  }

  async function apiGetAssigned() {
    const data = await authFetch(`${API_ROUTINES}/assigned`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.routines)) return data.routines;
    if (data && Array.isArray(data.assigned)) return data.assigned;
    return [];
  }

  async function apiAssignRoutine(routineId) {
    return authFetch(`${API_ROUTINES}/assign`, {
      method: "POST",
      body: JSON.stringify({ routineId }),
    });
  }

  async function apiGetProgress() {
    const data = await authFetch(`${API_ROUTINES}/progress`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.progress)) return data.progress;
    return [];
  }

  async function apiCompleteDay(routineId, dayIndex) {
    return authFetch(`${API_ROUTINES}/progress`, {
      method: "POST",
      body: JSON.stringify({ routineId, dayIndex }),
    });
  }

  // ================= Helper: normalizar rutina =================
  /**
   * El backend a veces devuelve:
   *  - La rutina directamente  { _id, name, ... }
   *  - Un documento de asignación { _id, user, routine: { ... } }
   */
  function normalizeRoutineDoc(doc) {
    if (!doc) return null;

    // Si ya parece una rutina (tiene name o days), úsala tal cual
    if (doc.name || doc.days) {
      return {
        ...doc,
        _rid: doc._id || doc.id,
      };
    }

    // Si es asignación con campo routine
    if (doc.routine) {
      return {
        ...(doc.routine || {}),
        _rid: (doc.routine && (doc.routine._id || doc.routine.id)) || doc.routineId,
        _assignmentId: doc._id || doc.id,
      };
    }

    // Último recurso: devolver algo con id
    return {
      ...doc,
      _rid: doc._id || doc.id || doc.routineId,
    };
  }

  // ================= Tabs por rol =================
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

  function buildTabs(role) {
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
        }
      });
      nav.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  // ================= PACIENTE: Rutinas =================
  async function renderPatientRoutines(user) {
    const grid = $("#routinesGrid");
    if (!grid) return;

    try {
      const [allRoutines, assignedRaw, progressList] = await Promise.all([
        apiGetAllRoutines(),
        apiGetAssigned(),
        apiGetProgress(),
      ]);

      // Normalizar asignadas a "rutinas planas"
      const assignedRoutines = assignedRaw
        .map(normalizeRoutineDoc)
        .filter(Boolean);

      // Mapa de progreso por routineId
      const progressMap = new Map();
      progressList.forEach((p) => {
        const rid =
          p.routineId ||
          (typeof p.routine === "string" ? p.routine : p.routine?._id) ||
          p.id ||
          p._id;
        if (!rid) return;
        progressMap.set(String(rid), p);
      });

      grid.innerHTML = "";

      if (!assignedRoutines.length) {
        grid.innerHTML = `
          <div class="col-span-1 md:col-span-2 lg:col-span-3">
            <div class="bg-white rounded-lg border p-6 text-gray-600">
              Aún no tienes rutinas asignadas. Usa “+ Seleccionar Rutina”.
            </div>
          </div>`;
        return;
      }

      assignedRoutines.forEach((r) => {
        const rid = String(r._rid || r._id || r.id || r.routineId);
        const total = r.days?.length || 0;
        const prog = progressMap.get(rid) || {};
        const daysDone = Array.isArray(prog.daysDone) ? prog.daysDone : [];
        const done = daysDone.filter(Boolean).length;
        const pct = total ? Math.round((done / total) * 100) : 0;

        const card = document.createElement("article");
        card.className = "bg-white rounded-lg card-minimal p-5 border";
        card.innerHTML = `
          <h4 class="text-lg font-medium text-gray-800 mb-1">
            ${r.name || "Sin nombre"}
          </h4>
          <p class="text-sm text-gray-500 mb-2">
            ${r.category || "—"} · ${r.difficulty || "—"} · ${
          r.duration ?? "—"
        } min
          </p>
          <p class="text-gray-600 mb-4">
            ${r.description || ""}
          </p>

          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progreso</span>
              <span>${done}/${total} (${pct}%)</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-500 h-2 rounded-full" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
              data-act="start"
              data-id="${rid}"
            >
              ${done < total ? "Continuar" : "Revisar"}
            </button>
            <button
              class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200"
              data-act="details"
              data-id="${rid}"
            >
              Detalles
            </button>
          </div>
        `;
        grid.appendChild(card);
      });

      // Delegar eventos
      grid.onclick = (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const rid = btn.dataset.id;
        const routine = assignedRoutines.find(
          (r) => String(r._rid || r._id || r.id || r.routineId) === String(rid)
        );
        if (!routine) return;

        const prog = progressMap.get(String(rid));
        if (btn.dataset.act === "start") {
          openExerciseScreen(user, routine, prog);
        } else {
          openRoutineDetails(routine, prog);
        }
      };
    } catch (err) {
      console.error(err);
      notify("No se pudieron cargar las rutinas asignadas", "error");
    }
  }

  function getNextDayIndex(routine, progressRecord) {
    const total = routine.days?.length || 0;
    const daysDone =
      (progressRecord && Array.isArray(progressRecord.daysDone)
        ? progressRecord.daysDone
        : Array(total).fill(false)) || [];
    const idx = daysDone.findIndex((d) => !d);
    return idx === -1 ? total - 1 : idx;
  }

  function openExerciseScreen(user, routine, progressRecord) {
    const scr = $("#exerciseScreen");
    if (!scr) return;

    const dayIndex = getNextDayIndex(routine, progressRecord);
    const day = routine.days?.[dayIndex] || {};

    $("#exerciseTitle").textContent = routine.name || "Rutina";
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

    scr.dataset.routineId = routine._rid || routine._id || routine.id;
    scr.dataset.dayIndex = String(dayIndex);
    scr.classList.remove("hidden");
  }

  function openRoutineDetails(routine, progressRecord) {
    const modal = $("#routineDetailsModal");
    if (!modal) return;

    const total = routine.days?.length || 0;
    const prog =
      progressRecord ||
      { daysDone: Array(total).fill(false), completedDate: null };

    $("#detailsRoutineName").textContent = routine.name || "Rutina";
    $("#detailsCompletionDate").textContent = prog.completedDate
      ? new Date(prog.completedDate).toLocaleString()
      : "—";

    const list = $("#exerciseDetailsList");
    list.innerHTML = "";
    (routine.days || []).forEach((d, i) => {
      const doneIcon = prog.daysDone?.[i] ? "✅" : "⬜";
      const div = document.createElement("div");
      div.className = "p-3 bg-gray-50 rounded";
      div.innerHTML = `<strong>${doneIcon} Día ${i + 1}:</strong> ${
        d.name
      } — ${d.reps} (${d.duration} min)`;
      list.appendChild(div);
    });

    modal.classList.remove("hidden");
  }

  // ================= Modal de selección de rutina =================
  function setupSelectRoutine(user) {
    const modal = $("#routineModal");
    const grid = $("#availableRoutines");
    const openBtn = $("#selectRoutineBtn");
    const cancelBtn = $("#cancelRoutine");
    if (!modal || !grid || !openBtn || !cancelBtn) return;

    openBtn.onclick = async () => {
      try {
        const [all, assignedRaw] = await Promise.all([
          apiGetAllRoutines(),
          apiGetAssigned(),
        ]);

        const assignedIds = new Set(
          assignedRaw
            .map(normalizeRoutineDoc)
            .filter(Boolean)
            .map((r) => String(r._rid || r._id || r.id || r.routineId))
        );

        grid.innerHTML = "";

        all.forEach((r) => {
          const rid = String(r._id || r.id);
          if (assignedIds.has(rid)) return;
          const card = document.createElement("article");
          card.className = "border rounded-lg p-4";
          card.innerHTML = `
            <h4 class="font-medium text-gray-800">${
              r.name || "Sin nombre"
            }</h4>
            <p class="text-sm text-gray-500 mb-2">
              ${r.category || "—"} · ${r.difficulty || "—"} · ${
            r.duration ?? "—"
          } min
            </p>
            <p class="text-gray-600 mb-4">${r.description || ""}</p>
            <button
              class="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
              data-id="${rid}"
            >
              Asignar a mi cuenta
            </button>
          `;
          grid.appendChild(card);
        });

        modal.classList.remove("hidden");
      } catch (err) {
        console.error(err);
        notify("No se pudieron cargar las rutinas", "error");
      }
    };

    grid.onclick = async (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      const routineId = btn.dataset.id;
      try {
        await apiAssignRoutine(routineId);
        notify("Rutina asignada a tu cuenta", "success");
        modal.classList.add("hidden");
        await renderPatientRoutines(user);
        await refreshProgressDashboard(user);
      } catch (err) {
        console.error(err);
        notify("No se pudo asignar la rutina", "error");
      }
    };

    cancelBtn.onclick = () => modal.classList.add("hidden");
  }

  // ================= Progreso (dashboard) =================
  async function refreshProgressDashboard(user) {
    if (!user) return;

    const completedSpan = $("#completedRoutines");
    const completedBar = $("#completedProgress");
    const exercisesSpan = $("#exercisesCount");
    const activeSpan = $("#activeDays");

    try {
      const [assignedRaw, progressList] = await Promise.all([
        apiGetAssigned(),
        apiGetProgress(),
      ]);

      const assigned = assignedRaw
        .map(normalizeRoutineDoc)
        .filter(Boolean);

      const totalR = assigned.length;

      const progressMap = new Map();
      progressList.forEach((p) => {
        const rid =
          p.routineId ||
          (typeof p.routine === "string" ? p.routine : p.routine?._id) ||
          p.id ||
          p._id;
        if (!rid) return;
        progressMap.set(String(rid), p);
      });

      const completedR = assigned.filter((r) => {
        const rid = String(r._rid || r._id || r.id || r.routineId);
        const rec = progressMap.get(rid);
        const total = r.days?.length || 0;
        return rec && Array.isArray(rec.daysDone)
          ? rec.daysDone.filter(Boolean).length === total && total > 0
          : false;
      }).length;

      const pct = totalR ? Math.round((completedR / totalR) * 100) : 0;
      if (completedSpan) completedSpan.textContent = `${completedR}/${totalR}`;
      if (completedBar) completedBar.style.width = `${pct}%`;

      let exercisesCount = 0;
      const activeDaySet = new Set();
      progressList.forEach((rec) => {
        if (Array.isArray(rec.history)) {
          exercisesCount += rec.history.length;
          rec.history.forEach((h) => {
            if (h.date) activeDaySet.add(h.date);
          });
        }
      });

      if (exercisesSpan) exercisesSpan.textContent = String(exercisesCount);
      if (activeSpan) activeSpan.textContent = String(activeDaySet.size);

      renderWeeklyChart(progressList);
    } catch (err) {
      console.error(err);
      notify("No se pudo cargar el progreso", "error");
    }
  }

  function renderWeeklyChart(progressList) {
    const cvs = $("#progressChart");
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width;
    const H = cvs.height;
    ctx.clearRect(0, 0, W, H);

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

  // ================= Comunes (logout, modales) =================
  function wireCommon(currentUser) {
    $("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_CURRENT);
      localStorage.removeItem(STORAGE_TOKEN);
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

    $("#completeExercise")?.addEventListener("click", async () => {
      const scr = $("#exerciseScreen");
      const rid = scr?.dataset.routineId;
      const day = parseInt(scr?.dataset.dayIndex || "0", 10);
      if (!rid) {
        $("#exerciseScreen")?.classList.add("hidden");
        return;
      }
      try {
        await apiCompleteDay(rid, day);
        $("#exerciseScreen")?.classList.add("hidden");
        await renderPatientRoutines(currentUser);
        await refreshProgressDashboard(currentUser);
        notify("¡Ejercicio completado!", "success");
      } catch (err) {
        console.error(err);
        notify("No se pudo guardar el progreso", "error");
      }
    });
  }

  // ================= Init =================
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
    buildTabs(role);
    wireCommon(currentUser);

    if (role === "patient") {
      setupSelectRoutine(currentUser);
      await renderPatientRoutines(currentUser);
      await refreshProgressDashboard(currentUser);
    } else if (role === "therapist") {
      // aquí podrías conectar el panel de terapeuta a la API si quieres
    }

    notify(
      `Sesión iniciada como ${
        role === "patient" ? "Paciente" : "Terapeuta"
      }`,
      "success"
    );
  });
})();

