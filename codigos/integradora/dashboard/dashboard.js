// dashboard.js — Panel paciente/terapeuta completo (crear/editar/eliminar rutinas)
(function () {
  "use strict";

  // ============================
  // Helpers DOM
  // ============================
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  // ============================
  // IMÁGENES DE EJERCICIOS (web)
  // ============================
  // Las imágenes deben estar en: dashboard/img/*.png
  const IMAGES = {
    // Rodilla
    knee_flex_ext: "img/knee_flex_ext.png",
    leg_raise: "img/leg_raise.png",
    quad_set: "img/quad_set.png",

    // Cuello
    neck_tilt: "img/neck_tilt.png",
    neck_rotation: "img/neck_rotation.png",
    neck_retraction: "img/neck_retraction.png",

    // Codo
    elbow_flex: "img/elbow_flex.png",
    pronation_supination: "img/pronation_supination.png",
    grip_isometric: "img/grip_isometric.png",

    // Hombro
    shoulder_raise: "img/shoulder_raise.png",
    rotator_cuff: "img/rotator_cuff.png",
    pendulum: "img/pendulum.png",

    // Espalda baja
    knees_to_chest: "img/knees_to_chest.png",
    cat_cow: "img/cat_cow.png",
    hip_bridge: "img/hip_bridge.png",

    // Abdominales
    bracing: "img/bracing.png",
    dead_bug: "img/dead_bug.png",
    plank_mod: "img/plank_mod.png",

    // Cadera
    side_leg_raise: "img/side_leg_raise.png",
    single_leg_bridge: "img/single_leg_bridge.png",
    side_steps: "img/side_steps.png",

    // Tobillo
    ankle_alphabet: "img/ankle_alphabet.png",
    calf_raise: "img/calf_raise.png",
    ankle_band: "img/ankle_band.png",

    // Muñeca
    wrist_curl: "img/wrist_curl.png",
    wrist_rotation: "img/wrist_rotation.png",
    wrist_stretch: "img/wrist_stretch.png",

    // Torácica
    thoracic_rotation: "img/thoracic_rotation.png",
    thoracic_extension: "img/thoracic_extension.png",
    open_book: "img/open_book.png",
  };

  // Mapea el nombre del ejercicio (texto) a la imagen correspondiente
  function getExerciseImageByName(name = "") {
    const n = name.toLowerCase();

    // Rodilla
    if (n.includes("flexión y extensión") || n.includes("flexion y extension"))
      return IMAGES.knee_flex_ext;
    if (n.includes("elevación de pierna recta") || n.includes("elevacion de pierna recta"))
      return IMAGES.leg_raise;
    if (n.includes("cuádriceps isométrico") || n.includes("cuadriceps isometrico"))
      return IMAGES.quad_set;

    // Cuello
    if (n.includes("inclinaciones laterales")) return IMAGES.neck_tilt;
    if (n.includes("rotaciones controladas")) return IMAGES.neck_rotation;
    if (n.includes("retracciones cervicales") || n.includes("isometría cervical"))
      return IMAGES.neck_retraction;

    // Codo
    if (n.includes("flexo-extensión") || n.includes("flexo extension"))
      return IMAGES.elbow_flex;
    if (n.includes("pronosupinación") || n.includes("pronosupinacion"))
      return IMAGES.pronation_supination;
    if (n.includes("agarre isométrico") || n.includes("agarre isometrico"))
      return IMAGES.grip_isometric;

    // Hombro
    if (n.includes("elevaciones frontales")) return IMAGES.shoulder_raise;
    if (n.includes("rotación externa") || n.includes("rotacion externa"))
      return IMAGES.rotator_cuff;
    if (n.includes("péndulo") || n.includes("pendulo")) return IMAGES.pendulum;

    // Espalda baja
    if (n.includes("rodillas al pecho")) return IMAGES.knees_to_chest;
    if (n.includes("gato") || n.includes("camello")) return IMAGES.cat_cow;
    if (n.includes("puente glúteo") || n.includes("puente gluteo"))
      return IMAGES.hip_bridge;

    // Abdominales
    if (n.includes("activación transverso") || n.includes("activacion transverso"))
      return IMAGES.bracing;
    if (n.includes("dead bug")) return IMAGES.dead_bug;
    if (n.includes("plancha modificada")) return IMAGES.plank_mod;

    // Cadera
    if (n.includes("abducción lateral") || n.includes("abduccion lateral"))
      return IMAGES.side_leg_raise;
    if (n.includes("puente una pierna")) return IMAGES.single_leg_bridge;
    if (n.includes("paso lateral con banda")) return IMAGES.side_steps;

    // Tobillo
    if (n.includes("abecedario con pie")) return IMAGES.ankle_alphabet;
    if (n.includes("elevación de talones") || n.includes("elevacion de talones"))
      return IMAGES.calf_raise;
    if (n.includes("inversión/eversión") || n.includes("inversion/eversion"))
      return IMAGES.ankle_band;

    // Muñeca
    if (n.includes("flex/ext con mancuerna")) return IMAGES.wrist_curl;
    if (n.includes("pronosupinación martillo") || n.includes("pronosupinacion martillo"))
      return IMAGES.wrist_rotation;
    if (n.includes("estiramiento flexor") || n.includes("estiramiento ext"))
      return IMAGES.wrist_stretch;

    // Torácica
    if (n.includes("rotación en cuadrupedia") || n.includes("rotacion en cuadrupedia"))
      return IMAGES.thoracic_rotation;
    if (n.includes("extensión sobre foam") || n.includes("extension sobre foam"))
      return IMAGES.thoracic_extension;
    if (n.includes("aperturas de libro") || n.includes("libro"))
      return IMAGES.open_book;

    return null;
  }

  // ============================
  // Notificaciones
  // ============================
  function notify(msg, type = "info") {
    const box = $("#notifications");
    if (!box) return console.log(`[${type}]`, msg);

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

  // ============================
  // Sesión
  // ============================
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
    return localStorage.getItem(TOKEN_KEY);
  }

  // =================================
  // API base (Render / local)
  // =================================
  const API_BASE = window.location.origin.includes("localhost")
    ? "http://localhost:4000/api"
    : "https://medihom-web.onrender.com/api";

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
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `Error HTTP ${res.status}`);
    }

    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  // =====================================
  // API Rutinas (paciente y terapeuta)
  // =====================================
  let cachedRoutines = [];
  let therapistRoutinesCache = [];
  let currentEditingRoutineId = null;

  // === Paciente / generales ===
  const apiGetAllRoutines = async () => {
    if (cachedRoutines.length) return cachedRoutines;
    const data = await authFetch(`${API_BASE}/routines`);
    cachedRoutines = Array.isArray(data) ? data : data.routines || [];
    return cachedRoutines;
  };

  const apiGetAssignedRoutineIds = async () => {
    const data = await authFetch(`${API_BASE}/routines/assigned`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.assigned)) return data.assigned;
    if (Array.isArray(data.routineIds)) return data.routineIds;
    return [];
  };

  const apiAssignRoutine = async (routineId) =>
    authFetch(`${API_BASE}/routines/assign`, {
      method: "POST",
      body: JSON.stringify({ routineId }),
    });

  const apiGetProgressMap = async () => {
    const arr = await authFetch(`${API_BASE}/routines/progress`);
    const map = {};
    if (Array.isArray(arr)) {
      arr.forEach((p) => {
        if (p && p.routineId) map[p.routineId] = p;
      });
    }
    return map;
  };

  const apiMarkDayDone = async (routineId, dayIndex, totalDays, exerciseName) =>
    authFetch(`${API_BASE}/routines/progress`, {
      method: "POST",
      body: JSON.stringify({
        routineId,
        dayIndex,
        totalDays,
        exerciseName,
      }),
    });

  // === Terapeuta ===
  const apiCreateRoutine = async (data) =>
    authFetch(`${API_BASE}/routines`, {
      method: "POST",
      body: JSON.stringify(data),
    });

  const apiUpdateRoutine = async (id, data) =>
    authFetch(`${API_BASE}/routines/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

  const apiDeleteRoutine = async (id) =>
    authFetch(`${API_BASE}/routines/${id}`, {
      method: "DELETE",
    });

  const apiGetTherapistRoutines = async () =>
    authFetch(`${API_BASE}/routines/therapist/mine`);

  const apiGetTherapistStats = async () =>
    authFetch(`${API_BASE}/routines/therapist/summary`); // <- ruta correcta en tu backend

  // =============================
  // Tabs según rol
  // =============================
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

  function buildTabs(role, user) {
    const tabs = ROLE_TABS[role] || ROLE_TABS.patient;
    const nav = $("#navigationTabs");
    nav.innerHTML = "";

    tabs.forEach((t, i) => {
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
          refreshProgressDashboard(user);
        } else if (t.id === "therapistSection") {
          refreshTherapistDashboard(user);
        }
      });

      nav.appendChild(btn);
      if (i === 0) btn.click();
    });
  }

  // ======================================
  // PACIENTE — seleccionar rutinas
  // ======================================
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
          const yaTiene = assignedSet.has(r.id);
          const card = document.createElement("article");
          card.className = "border rounded-lg p-4 bg-white";
          card.innerHTML = `
            <h4 class="font-medium text-gray-800">${r.name}</h4>
            <p class="text-sm text-gray-500 mb-2">${r.category} · ${
            r.difficulty
          } · ${r.duration} min</p>
            <p class="text-gray-600 mb-4">${r.description}</p>
            <button class="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
                    data-id="${r.id}" ${yaTiene ? "disabled" : ""}>
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

  // ======================================
  // PACIENTE — Rutinas asignadas
  // ======================================
  function getNextDayIndex(routine, progressRecord) {
    const total = routine.days?.length || 0;
    const daysDone = Array.isArray(progressRecord?.daysDone)
      ? progressRecord.daysDone.slice()
      : Array.from({ length: total }, () => false);

    const idx = daysDone.findIndex((v) => !v);
    return idx === -1 ? total - 1 : idx;
  }

  async function renderPatientRoutines(user) {
    const grid = $("#routinesGrid");
    if (!grid) return;

    grid.innerHTML = `
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
      const myRoutines = all.filter((r) => assignedSet.has(r.id));

      grid.innerHTML = "";

      if (!myRoutines.length) {
        grid.innerHTML = `
          <div class="col-span-1 md:col-span-2 lg:col-span-3">
            <div class="bg-white rounded-lg border p-6 text-gray-600">
              Aún no tienes rutinas asignadas. Usa “+ Seleccionar Rutina”.
            </div>
          </div>`;
        return;
      }

      myRoutines.forEach((r) => {
        const prog = progressMap[r.id] || {};
        const total = r.days?.length || 0;

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
                    data-act="start" data-id="${r.id}">
              ${done < total ? "Continuar" : "Revisar"}
            </button>
            <button class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200"
                    data-act="details" data-id="${r.id}">
              Detalles
            </button>
          </div>
        `;
        grid.appendChild(card);
      });

      // Delegación de eventos
      grid.onclick = (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = btn.dataset.id;
        const routine = myRoutines.find((r) => r.id === id);
        if (!routine) return;

        const prog = progressMap[id] || {};

        if (btn.dataset.act === "start") {
          openExerciseScreen(routine, prog);
        } else if (btn.dataset.act === "details") {
          openRoutineDetails(routine, prog);
        }
      };
    } catch (err) {
      console.error(err);
      notify("No se pudieron cargar tus rutinas", "error");
    }
  }

  function openExerciseScreen(routine, progressRecord) {
    const scr = $("#exerciseScreen");
    if (!scr) return;

    const dayIndex = getNextDayIndex(routine, progressRecord);
    const d =
      routine.days?.[dayIndex] || {
        name: "Ejercicio",
        reps: "",
        duration: 5,
        instructions: [],
      };

    $("#exerciseTitle").textContent = routine.name;
    $("#exerciseDay").textContent = `Día ${dayIndex + 1}`;
    $("#currentExerciseName").textContent = d.name;
    $("#currentExerciseReps").textContent = d.reps || "";
    $("#exerciseDuration").textContent = (d.duration || 5) + " min";

    const ul = $("#exerciseInstructions");
    ul.innerHTML = "";
    (d.instructions || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = "• " + t;
      ul.appendChild(li);
    });

    // 🔹 Imagen del ejercicio (como en la app)
    const imgEl = $("#exerciseImage");
    if (imgEl) {
      const imgSrc = getExerciseImageByName(d.name || "");
      if (imgSrc) {
        imgEl.src = imgSrc;
        imgEl.alt = d.name || "Ejercicio de rehabilitación";
        imgEl.classList.remove("hidden");
      } else {
        imgEl.classList.add("hidden");
      }
    }

    scr.dataset.routineId = routine.id;
    scr.dataset.dayIndex = String(dayIndex);

    scr.classList.remove("hidden");
  }

  async function openRoutineDetails(routine, progressRecord) {
    const modal = $("#routineDetailsModal");
    if (!modal) return;

    const total = routine.days?.length || 0;
    const daysDone = Array.isArray(progressRecord?.daysDone)
      ? progressRecord.daysDone
      : Array.from({ length: total }, () => false);

    $("#detailsRoutineName").textContent = routine.name;
    $("#detailsCompletionDate").textContent = progressRecord?.completedAt
      ? new Date(progressRecord.completedAt).toLocaleString()
      : "—";

    const list = $("#exerciseDetailsList");
    list.innerHTML = "";

    (routine.days || []).forEach((d, i) => {
      const doneIcon = daysDone[i] ? "✅" : "⬜";
      const imgSrc = getExerciseImageByName(d.name || "");
      const thumbHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${d.name || ""}" class="w-12 h-12 rounded-md object-contain bg-slate-100" />`
        : "";

      const div = document.createElement("div");
      div.className = "p-3 bg-gray-50 rounded";
      div.innerHTML = `
        <div class="flex items-center gap-3">
          ${thumbHtml}
          <div>
            <strong>${doneIcon} Día ${i + 1}:</strong> ${d.name} — ${d.reps} (${d.duration} min)
          </div>
        </div>`;
      list.appendChild(div);
    });

    modal.classList.remove("hidden");
  }

  // ======================================
  // PACIENTE — Progreso
  // ======================================
  async function refreshProgressDashboard(user) {
    if (!user) return;

    try {
      const [all, assignedIds, progressMap] = await Promise.all([
        apiGetAllRoutines(),
        apiGetAssignedRoutineIds(),
        apiGetProgressMap(),
      ]);

      const assignedSet = new Set(assignedIds);
      const myRoutines = all.filter((r) => assignedSet.has(r.id));

      const totalR = myRoutines.length;
      const completedR = myRoutines.filter((r) => {
        const rec = progressMap[r.id];
        if (!rec) return false;
        if (Array.isArray(rec.daysDone))
          return (
            rec.daysDone.length &&
            rec.daysDone.every((v) => v === true || v === 1)
          );
        return false;
      }).length;

      const completedSpan = $("#completedRoutines");
      const completedBar = $("#completedProgress");
      if (completedSpan) completedSpan.textContent = `${completedR}/${totalR}`;
      const pct = totalR ? Math.round((completedR / totalR) * 100) : 0;
      if (completedBar) completedBar.style.width = `${pct}%`;

      let exercisesCount = 0;
      const activeDaySet = new Set();
      Object.values(progressMap).forEach((rec) => {
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

    Object.values(progressMap).forEach((rec) => {
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

  // ======================================
  // TERAPEUTA — UI (crear/editar/eliminar)
  // ======================================
  function clearRoutineForm() {
    $("#routineName").value = "";
    $("#routineCategory").value = "";
    $("#routineDifficulty").value = "";
    $("#routineDuration").value = "";
    $("#routineDescription").value = "";

    $("#exercise1Name").value = "";
    $("#exercise1Reps").value = "";
    $("#exercise1Duration").value = "";

    $("#exercise2Name").value = "";
    $("#exercise2Reps").value = "";
    $("#exercise2Duration").value = "";

    $("#exercise3Name").value = "";
    $("#exercise3Reps").value = "";
    $("#exercise3Duration").value = "";
  }

  function fillRoutineFormFromRoutine(r) {
    $("#routineName").value = r.name || "";
    $("#routineCategory").value = r.category || "";
    $("#routineDifficulty").value = r.difficulty || "";
    $("#routineDuration").value = r.duration || "";
    $("#routineDescription").value = r.description || "";

    const d1 = r.days?.[0] || {};
    const d2 = r.days?.[1] || {};
    const d3 = r.days?.[2] || {};

    $("#exercise1Name").value = d1.name || "";
    $("#exercise1Reps").value = d1.reps || "";
    $("#exercise1Duration").value = d1.duration || "";

    $("#exercise2Name").value = d2.name || "";
    $("#exercise2Reps").value = d2.reps || "";
    $("#exercise2Duration").value = d2.duration || "";

    $("#exercise3Name").value = d3.name || "";
    $("#exercise3Reps").value = d3.reps || "";
    $("#exercise3Duration").value = d3.duration || "";
  }

  function buildRoutinePayloadFromForm() {
    const name = $("#routineName").value.trim();
    const category = $("#routineCategory").value;
    const difficulty = $("#routineDifficulty").value;
    const duration = parseInt($("#routineDuration").value || "0", 10);
    const description = $("#routineDescription").value.trim();

    const days = [
      {
        name: $("#exercise1Name").value.trim(),
        reps: $("#exercise1Reps").value.trim(),
        duration: parseInt($("#exercise1Duration").value || "0", 10),
        instructions: [],
      },
      {
        name: $("#exercise2Name").value.trim(),
        reps: $("#exercise2Reps").value.trim(),
        duration: parseInt($("#exercise2Duration").value || "0", 10),
        instructions: [],
      },
      {
        name: $("#exercise3Name").value.trim(),
        reps: $("#exercise3Reps").value.trim(),
        duration: parseInt($("#exercise3Duration").value || "0", 10),
        instructions: [],
      },
    ];

    return { name, category, difficulty, duration, description, days };
  }

  async function refreshTherapistDashboard(user) {
    try {
      const [stats, routines] = await Promise.all([
        apiGetTherapistStats(),
        apiGetTherapistRoutines(),
      ]);

      therapistRoutinesCache = routines || [];

      $("#therapistRoutinesCount").textContent = stats.totalCreated ?? 0;
      $("#activePatientsCount").textContent = stats.activePatients ?? 0;
      $("#completedTherapistRoutines").textContent =
        stats.completedRoutines ?? 0;
      $("#successRate").textContent = (stats.successRate ?? 0) + "%";

      const grid = $("#therapistRoutinesGrid");
      grid.innerHTML = "";

      if (!therapistRoutinesCache.length) {
        grid.innerHTML = `
          <div class="col-span-1">
            <div class="bg-white rounded-lg border p-6 text-gray-600">
              Aún no has creado rutinas. Usa “+ Crear Nueva Rutina”.
            </div>
          </div>`;
        return;
      }

      therapistRoutinesCache.forEach((r) => {
        const card = document.createElement("article");
        card.className = "bg-white rounded-lg border p-5";
        card.innerHTML = `
          <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
          <p class="text-sm text-gray-500 mb-2">${r.category} · ${
          r.difficulty
        } · ${r.duration} min</p>
          <p class="text-gray-600 mb-4">${r.description}</p>
          <div class="flex gap-2">
            <button class="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700"
                    data-act="edit" data-id="${r.id}">
              Editar
            </button>
            <button class="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600"
                    data-act="delete" data-id="${r.id}">
              Eliminar
            </button>
          </div>
        `;
        grid.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      notify("Error al cargar panel del terapeuta", "error");
    }
  }

  function setupTherapistUI(user) {
    const openBtn = $("#createRoutineBtn");
    const modal = $("#createRoutineModal");
    const closeBtn = $("#closeCreateRoutineModal");
    const cancelBtn = $("#cancelCreateRoutine");
    const form = $("#createRoutineForm");
    const grid = $("#therapistRoutinesGrid");

    if (!openBtn || !modal || !form || !grid) return;

    // Abrir para CREAR
    openBtn.addEventListener("click", () => {
      currentEditingRoutineId = null;
      clearRoutineForm();
      modal.classList.remove("hidden");
    });

    const closeModal = () => {
      modal.classList.add("hidden");
      currentEditingRoutineId = null;
    };

    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    // Submit (crear / editar)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = buildRoutinePayloadFromForm();

      if (
        !payload.name ||
        !payload.category ||
        !payload.difficulty ||
        !payload.duration
      ) {
        notify("Completa todos los campos de la rutina", "error");
        return;
      }

      try {
        if (currentEditingRoutineId) {
          await apiUpdateRoutine(currentEditingRoutineId, payload);
          notify("Rutina actualizada correctamente", "success");
        } else {
          await apiCreateRoutine(payload);
          notify("Rutina creada correctamente", "success");
        }

        closeModal();
        cachedRoutines = [];
        await refreshTherapistDashboard(user);
      } catch (err) {
        console.error(err);
        notify("Error al guardar la rutina", "error");
      }
    });

    // Editar / eliminar desde el grid
    grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      const id = btn.dataset.id;
      const routine = therapistRoutinesCache.find((r) => r.id === id);
      if (!routine) return;

      if (btn.dataset.act === "edit") {
        currentEditingRoutineId = id;
        fillRoutineFormFromRoutine(routine);
        modal.classList.remove("hidden");
      } else if (btn.dataset.act === "delete") {
        const ok = window.confirm(
          "¿Seguro que deseas eliminar esta rutina? Esta acción no se puede deshacer."
        );
        if (!ok) return;

        try {
          await apiDeleteRoutine(id);
          notify("Rutina eliminada", "success");
          cachedRoutines = [];
          await refreshTherapistDashboard(user);
        } catch (err) {
          console.error(err);
          notify("Error al eliminar la rutina", "error");
        }
      }
    });
  }

  // ======================================
  // Botones comunes
  // ======================================
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
        const routine = all.find((r) => r.id === rid);
        if (!routine) {
          $("#exerciseScreen")?.classList.add("hidden");
          return;
        }

        await apiMarkDayDone(
          rid,
          dayIndex,
          routine.days?.length || 3,
          routine.days?.[dayIndex]?.name || `Día ${dayIndex + 1}`
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

  // ======================================
  // INIT
  // ======================================
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
      setupTherapistUI(currentUser);
      await refreshTherapistDashboard(currentUser);
    }

    notify(
      `Sesión iniciada como ${
        role === "patient" ? "Paciente" : "Terapeuta"
      }`,
      "success"
    );
  });
})();


