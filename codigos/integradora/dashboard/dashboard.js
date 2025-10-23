// dashboard.js — roles, rutinas y progreso (paciente) + creación (terapeuta) con LocalStorage
(function () {
  "use strict";

  const LOGIN_PATH = "../login/index.html";

  // === Helpers de DOM ===
  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  // === Notificaciones ===
  function notify(msg, type = "info") {
    const box = $("#notifications");
    if (!box) { console.log(`[${type}]`, msg); return; }
    const el = document.createElement("div");
    el.className =
      "px-4 py-3 rounded-xl shadow text-white text-sm " +
      (type === "error" ? "bg-red-500"
       : type === "success" ? "bg-green-600"
       : "bg-gray-800");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // === Storage keys y funciones ===
  const K = {
    CURRENT_USER: "currentUser",
    ROUTINES: "routines",          // catálogo (HTML + creadas por terapeuta)
    ASSIGNED: "assignedRoutines",  // { userId: [routineIds] }
    PROGRESS: "progressByUser"     // { userId: { [routineId]: { daysDone:[bool], completedDate, history:[{date,dayIndex,exerciseName}] } } }
  };

  const load = (k, defVal) => {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(defVal)); }
    catch { return defVal; }
  };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function getUser() {
    try { return JSON.parse(localStorage.getItem(K.CURRENT_USER) || "null"); }
    catch { return null; }
  }
  function requireSession() {
    const u = getUser();
    if (!u) { window.location.href = LOGIN_PATH; return null; }
    return u;
  }

  // === Cargar rutinas desde el HTML (NO desde JS) ===
  function loadRoutinesFromHTML() {
    const el = document.getElementById("rehabRoutines");
    if (!el) return [];
    try { return JSON.parse(el.textContent.trim()); } catch { return []; }
  }
  function ensureRoutinesFromHTML() {
    const current = load(K.ROUTINES, []);
    if (current && current.length) return;
    const fromHTML = loadRoutinesFromHTML();
    if (fromHTML.length) save(K.ROUTINES, fromHTML);
  }

  // === PROGRESO (por usuario/rutina) ===
  function getProgressMap(userId) {
    const all = load(K.PROGRESS, {});
    return all[userId] || {};
  }
  function setProgressMap(userId, map) {
    const all = load(K.PROGRESS, {});
    all[userId] = map;
    save(K.PROGRESS, all);
  }
  function ensureRoutineProgress(userId, routine) {
    const map = getProgressMap(userId);
    if (!map[routine.id]) {
      map[routine.id] = {
        daysDone: Array.from({ length: (routine.days?.length || 3) }, () => false),
        completedDate: null,
        history: [] // {date:'YYYY-MM-DD', dayIndex:0..n, exerciseName:string}
      };
      setProgressMap(userId, map);
    }
    return map[routine.id];
  }
  function markDayDone(userId, routine, dayIndex) {
    const map = getProgressMap(userId);
    const rec = ensureRoutineProgress(userId, routine);
    rec.daysDone[dayIndex] = true;

    // Historial
    const today = new Date();
    const dstr  = today.toISOString().slice(0,10);
    const exName = routine.days?.[dayIndex]?.name || `Día ${dayIndex+1}`;
    rec.history.push({ date: dstr, dayIndex, exerciseName: exName });

    // ¿Rutina completada?
    if (rec.daysDone.every(Boolean) && !rec.completedDate) {
      rec.completedDate = today.toISOString();
      notify("¡Rutina completada!", "success");
    }
    map[routine.id] = rec;
    setProgressMap(userId, map);
  }
  function nextPendingDayIndex(progress) {
    const i = progress.daysDone.findIndex(v => !v);
    return i === -1 ? progress.daysDone.length - 1 : i;
  }

  // === UI: Tabs por rol ===
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
  function buildTabs(role) {
    const tabs = ROLE_TABS[role] || ROLE_TABS.patient;
    const nav = $("#navigationTabs");
    if (!nav) return;
    nav.innerHTML = "";

    tabs.forEach((t, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "px-3 py-2 text-sm border-b-2 border-transparent hover:border-blue-500";
      btn.textContent = t.label;
      btn.dataset.target = t.id;
      btn.addEventListener("click", () => {
        $$("#navigationTabs button").forEach(b => b.classList.remove("border-blue-600", "text-blue-600"));
        btn.classList.add("border-blue-600", "text-blue-600");
        $$(".section").forEach(s => s.classList.add("hidden"));
        document.getElementById(t.id)?.classList.remove("hidden");
        if (t.id === "progressSection") refreshProgressDashboard(currentUser);
      });
      nav.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  // === PACIENTE: Rutinas ===
  function renderPatientRoutines(user) {
    const routinesGrid = $("#routinesGrid");
    if (!routinesGrid) return;

    const all = load(K.ROUTINES, []);
    const assignedMap = load(K.ASSIGNED, {});
    const assignedIds = new Set(assignedMap[user.id] || []);
    const myRoutines = all.filter(r => assignedIds.has(r.id));

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

    myRoutines.forEach(r => {
      const prog = ensureRoutineProgress(user.id, r);
      const total = r.days?.length || 3;
      const done  = prog.daysDone.filter(Boolean).length;
      const pct   = Math.round((done / total) * 100);

      const card = document.createElement("article");
      card.className = "bg-white rounded-lg card-minimal p-5 border";
      card.innerHTML = `
        <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
        <p class="text-sm text-gray-500 mb-2">${r.category} · ${r.difficulty} · ${r.duration} min</p>
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
      routinesGrid.appendChild(card);
    });

    routinesGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.dataset.id;
      const all = load(K.ROUTINES, []);
      const r = all.find(x => x.id === id);
      if (!r) return;

      if (btn.dataset.act === "start") {
        openExerciseScreen(user, r);
      } else if (btn.dataset.act === "details") {
        openRoutineDetails(user, r);
      }
    });
  }

  function openExerciseScreen(user, routine) {
    const scr = $("#exerciseScreen");
    if (!scr) return;

    const prog = ensureRoutineProgress(user.id, routine);
    const dayIndex = nextPendingDayIndex(prog);
    const d = routine.days?.[dayIndex] || { name: "Ejercicio", reps: "", duration: 5, instructions: [] };

    $("#exerciseTitle").textContent = routine.name;
    $("#exerciseDay").textContent   = `Día ${dayIndex + 1}`;
    $("#currentExerciseName").textContent = d.name;
    $("#currentExerciseReps").textContent = d.reps || "";
    $("#exerciseDuration").textContent    = (d.duration || 5) + " min";

    const ul = $("#exerciseInstructions");
    ul.innerHTML = "";
    (d.instructions || []).forEach(t => {
      const li = document.createElement("li");
      li.textContent = "• " + t;
      ul.appendChild(li);
    });

    // guarda id e índice actual en dataset para el botón "Completar"
    scr.dataset.routineId = routine.id;
    scr.dataset.dayIndex  = String(dayIndex);

    scr.classList.remove("hidden");
  }

  function openRoutineDetails(user, routine) {
    const modal = $("#routineDetailsModal");
    if (!modal) return;

    const prog = ensureRoutineProgress(user.id, routine);
    $("#detailsRoutineName").textContent = routine.name;
    $("#detailsCompletionDate").textContent = prog.completedDate
      ? new Date(prog.completedDate).toLocaleString()
      : "—";

    const list = $("#exerciseDetailsList");
    list.innerHTML = "";
    (routine.days || []).forEach((d, i) => {
      const doneIcon = prog.daysDone[i] ? "✅" : "⬜";
      const div = document.createElement("div");
      div.className = "p-3 bg-gray-50 rounded";
      div.innerHTML = `<strong>${doneIcon} Día ${i + 1}:</strong> ${d.name} — ${d.reps} (${d.duration} min)`;
      list.appendChild(div);
    });

    modal.classList.remove("hidden");
  }

  // Modal: seleccionar y asignar rutinas (paciente)
  function setupSelectRoutine(user) {
    const modal = $("#routineModal");
    const grid = $("#availableRoutines");
    const btnOpen = $("#selectRoutineBtn");
    const btnCancel = $("#cancelRoutine");
    if (!modal || !grid || !btnOpen || !btnCancel) return;

    btnOpen.addEventListener("click", () => {
      const all = load(K.ROUTINES, []);
      grid.innerHTML = "";
      all.forEach(r => {
        const card = document.createElement("article");
        card.className = "border rounded-lg p-4";
        card.innerHTML = `
          <h4 class="font-medium text-gray-800">${r.name}</h4>
          <p class="text-sm text-gray-500 mb-2">${r.category} · ${r.difficulty} · ${r.duration} min</p>
          <p class="text-gray-600 mb-4">${r.description}</p>
          <button class="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700" data-id="${r.id}">
            Asignar a mi cuenta
          </button>
        `;
        grid.appendChild(card);
      });
      modal.classList.remove("hidden");
    });

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      const routineId = btn.dataset.id;
      const assignedMap = load(K.ASSIGNED, {});
      const list = new Set(assignedMap[user.id] || []);
      list.add(routineId);
      assignedMap[user.id] = Array.from(list);
      save(K.ASSIGNED, assignedMap);
      notify("Rutina asignada a tu cuenta", "success");
      modal.classList.add("hidden");
      renderPatientRoutines(user);
      refreshProgressDashboard(user);
    });

    btnCancel.addEventListener("click", () => modal.classList.add("hidden"));
  }

  // === TERAPEUTA: Crear y listar rutinas propias ===
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
      successRate: $("#successRate")
    };

    function refreshList() {
      const all = load(K.ROUTINES, []);
      const mine = all.filter(r => r.ownerId === user.id);
      grid.innerHTML = "";
      mine.forEach(r => {
        const card = document.createElement("article");
        card.className = "bg-white rounded-lg border p-5";
        card.innerHTML = `
          <h4 class="text-lg font-medium text-gray-800 mb-1">${r.name}</h4>
          <p class="text-sm text-gray-500 mb-2">${r.category} · ${r.difficulty} · ${r.duration} min</p>
          <p class="text-gray-600">${r.description}</p>
        `;
        grid.appendChild(card);
      });

      // métricas demo
      counters.created.textContent = mine.length;
      counters.activePatients.textContent = 0;
      counters.completed.textContent = 0;
      counters.successRate.textContent = "0%";
    }

    openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeA?.addEventListener("click", () => modal.classList.add("hidden"));
    cancelA?.addEventListener("click", () => modal.classList.add("hidden"));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#routineName")?.value.trim();
      const category = $("#routineCategory")?.value;
      const difficulty = $("#routineDifficulty")?.value;
      const duration = parseInt($("#routineDuration")?.value || "0", 10);
      const description = $("#routineDescription")?.value.trim();

      const days = [
        { name: $("#exercise1Name")?.value.trim(), reps: $("#exercise1Reps")?.value.trim(),
          duration: parseInt($("#exercise1Duration")?.value || "0", 10), instructions: [] },
        { name: $("#exercise2Name")?.value.trim(), reps: $("#exercise2Reps")?.value.trim(),
          duration: parseInt($("#exercise2Duration")?.value || "0", 10), instructions: [] },
        { name: $("#exercise3Name")?.value.trim(), reps: $("#exercise3Reps")?.value.trim(),
          duration: parseInt($("#exercise3Duration")?.value || "0", 10), instructions: [] }
      ];

      if (!name || !category || !difficulty || !duration) {
        return notify("Completa los campos obligatorios", "error");
      }

      const all = load(K.ROUTINES, []);
      all.push({
        id: "rtn-" + Date.now(),
        name, category, difficulty, duration, description,
        days,
        ownerId: user.id
      });
      save(K.ROUTINES, all);
      notify("Rutina creada", "success");
      modal.classList.add("hidden");
      form.reset();
      refreshList();
    });

    refreshList();
  }

  // === PROGRESO: Estadísticas y gráfica ===
  function refreshProgressDashboard(user) {
    if (!user) return;

    const all = load(K.ROUTINES, []);
    const assignedMap = load(K.ASSIGNED, {});
    const ids = new Set(assignedMap[user.id] || []);
    const myRoutines = all.filter(r => ids.has(r.id));

    // números
    const progressMap = getProgressMap(user.id);
    const totalR = myRoutines.length;
    const completedR = myRoutines.filter(r => (progressMap[r.id]?.daysDone || []).every(Boolean)).length;

    const completedSpan = $("#completedRoutines");
    const completedBar  = $("#completedProgress");
    if (completedSpan) completedSpan.textContent = `${completedR}/${totalR}`;
    const pct = totalR ? Math.round((completedR / totalR) * 100) : 0;
    if (completedBar)  completedBar.style.width = `${pct}%`;

    // ejercicios realizados + días activos
    let exercisesCount = 0;
    const activeDaySet = new Set();
    Object.values(progressMap).forEach(rec => {
      exercisesCount += rec.history.length;
      rec.history.forEach(h => activeDaySet.add(h.date));
    });
    $("#exercisesCount").textContent = String(exercisesCount);
    $("#activeDays").textContent = String(activeDaySet.size);

    // Gráfica semanal por días (L-D) basada en history (últimos 7 días)
    renderWeeklyChart(progressMap);
  }

  function renderWeeklyChart(progressMap) {
    const cvs = $("#progressChart");
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;

    // recolecta conteos por día (últimos 7 días)
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0,10));
    }
    const counts = Array(7).fill(0);
    Object.values(progressMap).forEach(rec => {
      rec.history.forEach(h => {
        const idx = days.indexOf(h.date);
        if (idx >= 0) counts[idx] += 1;
      });
    });

    // limpiar
    ctx.clearRect(0, 0, W, H);

    // ejes simples
    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    const padding = 30;
    const chartW = W - padding * 2;
    const chartH = H - padding * 2;

    // escala
    const maxV = Math.max(1, ...counts);
    const barW = chartW / counts.length * 0.6;
    const gap  = chartW / counts.length * 0.4;

    // eje X labels (Días cortos)
    const dayNames = ["L","M","X","J","V","S","D"];
    for (let i = 0; i < counts.length; i++) {
      const x = padding + i * (barW + gap) + gap/2 + barW/2;
      ctx.textAlign = "center";
      const d = new Date(days[i]);
      ctx.fillText(dayNames[d.getDay() === 0 ? 6 : d.getDay()-1], x, H - 8);
    }

    // barras
    for (let i = 0; i < counts.length; i++) {
      const val = counts[i];
      const h = (val / maxV) * (chartH - 10);
      const x = padding + i * (barW + gap) + gap/2;
      const y = H - padding - h;
      // barra
      ctx.fillStyle = "#22c55e"; // verde (coincide con UI)
      ctx.fillRect(x, y, barW, h);
      // valor
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.fillText(String(val), x + barW/2, y - 4);
    }

    // borde
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(padding-6, padding-6, chartW+12, chartH+12);
  }

  // === Botones comunes (logout y cierres) ===
  function wireCommon(currentUser) {
    $("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem(K.CURRENT_USER);
      notify("Sesión cerrada", "success");
      setTimeout(() => window.location.href = LOGIN_PATH, 200);
    });

    $("#closeDetailsBtn")?.addEventListener("click", () => $("#routineDetailsModal")?.classList.add("hidden"));
    $("#closeDetailsModal")?.addEventListener("click", () => $("#routineDetailsModal")?.classList.add("hidden"));
    $("#cancelExercise")?.addEventListener("click", () => $("#exerciseScreen")?.classList.add("hidden"));

    $("#completeExercise")?.addEventListener("click", () => {
      const scr = $("#exerciseScreen");
      const rid = scr?.dataset.routineId;
      const day = parseInt(scr?.dataset.dayIndex || "0", 10);
      if (!rid) return $("#exerciseScreen")?.classList.add("hidden");

      const all = load(K.ROUTINES, []);
      const routine = all.find(r => r.id === rid);
      if (!routine) return $("#exerciseScreen")?.classList.add("hidden");

      markDayDone(currentUser.id, routine, day);
      $("#exerciseScreen")?.classList.add("hidden");

      // refrescar UI
      renderPatientRoutines(currentUser);
      refreshProgressDashboard(currentUser);
      notify("¡Ejercicio completado!", "success");
    });
  }

  // === Init ===
  let currentUser = null;
  document.addEventListener("DOMContentLoaded", () => {
    currentUser = requireSession();
    if (!currentUser) return;

    // Header
    const welcome = $("#userWelcome");
    if (welcome) welcome.textContent = currentUser.name ? `Hola, ${currentUser.name}` : (currentUser.email || "");

    // Carga rutinas desde el HTML y tabs por rol
    ensureRoutinesFromHTML();
    const role = (currentUser.role || "patient").toLowerCase();
    buildTabs(role);
    wireCommon(currentUser);

    // Enciende funciones según rol
    if (role === "patient") {
      setupSelectRoutine(currentUser);
      renderPatientRoutines(currentUser);
      refreshProgressDashboard(currentUser);
    } else if (role === "therapist") {
      setupTherapistCreate(currentUser);
    }

    notify(`Sesión iniciada como ${role === "patient" ? "Paciente" : "Terapeuta"}`, "success");
  });
})();
