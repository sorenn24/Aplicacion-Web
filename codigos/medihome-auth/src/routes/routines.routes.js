// src/routes/routines.routes.js
const express = require("express");
const RoutineProgress = require("../models/routineProgress.model");

const router = express.Router();

// === Catálogo base de rutinas (como las que tenías en el <script> del HTML) ===
const BASE_ROUTINES = [
  {
    id: "rtn-espalda-lumbar-suave",
    name: "Espalda (lumbar) — Movilidad suave",
    category: "Espalda",
    difficulty: "Principiante",
    duration: 18,
    description: "Disminuir rigidez lumbar y mejorar control lumbopélvico.",
    days: [
      {
        name: "Basculación pélvica en supino",
        reps: "3×10",
        duration: 6,
        instructions: [
          "Rodillas flexionadas",
          "Retroversión pélvica",
          "Respira profundo",
        ],
      },
      {
        name: "Puente glúteo asistido",
        reps: "3×10",
        duration: 6,
        instructions: [
          "Eleva cadera sin dolor",
          "Mantén 2s",
          "Desciende controlado",
        ],
      },
      {
        name: "Gato–camello",
        reps: "3×8",
        duration: 6,
        instructions: ["Movimiento lento", "Evita dolor agudo", "Sin rebotes"],
      },
    ],
    ownerId: null,
  },
  {
    id: "rtn-cuello-descarga",
    name: "Cuello — Descarga cervical",
    category: "Cuello",
    difficulty: "Intermedio",
    duration: 15,
    description: "Reducir tensión cervical y mejorar movilidad sin dolor.",
    days: [
      {
        name: "Inclinaciones laterales activas",
        reps: "3×8 por lado",
        duration: 5,
        instructions: ["Rango sin dolor", "Hombros relajados", "Tempo lento"],
      },
      {
        name: "Rotaciones controladas",
        reps: "3×8 por lado",
        duration: 5,
        instructions: ["Mirada al frente", "Evita mareo"],
      },
      {
        name: "Isometría cervical suave (mano–frente)",
        reps: "3×20s",
        duration: 5,
        instructions: ["Presión 20–30%", "No contener la respiración"],
      },
    ],
    ownerId: null,
  },
  {
    id: "rtn-rodilla-control",
    name: "Rodilla — Control y fortalecimiento leve",
    category: "Piernas",
    difficulty: "Principiante",
    duration: 15,
    description: "Activación de cuádriceps y control sin impacto.",
    days: [
      {
        name: "Cuádriceps isométrico en extensión",
        reps: "5×15s",
        duration: 5,
        instructions: ["Toalla bajo rodilla", "Contracción suave", "Sin dolor"],
      },
      {
        name: "Elevación de pierna recta",
        reps: "3×10",
        duration: 5,
        instructions: ["Rodilla extendida", "Sube 30–40°", "Controlado"],
      },
      {
        name: "Mini-sentadilla a silla",
        reps: "3×8",
        duration: 5,
        instructions: [
          "Apoyo en silla",
          "Rodillas alineadas",
          "Peso repartido",
        ],
      },
    ],
    ownerId: null,
  },
  {
    id: "rtn-hombro-escapular",
    name: "Hombro — Estabilidad escapular",
    category: "Brazos",
    difficulty: "Intermedio",
    duration: 18,
    description: "Mejorar control escapular y rango sin dolor.",
    days: [
      {
        name: "Retracción escapular en pared",
        reps: "3×10",
        duration: 6,
        instructions: ["Espalda a la pared", "Hombros abajo y atrás"],
      },
      {
        name: "Deslizamientos tipo ‘ángel’",
        reps: "3×8",
        duration: 6,
        instructions: [
          "Codos y muñecas a la pared",
          "Sube/baja controlado",
        ],
      },
      {
        name: "Rotación externa con banda",
        reps: "3×12",
        duration: 6,
        instructions: [
          "Codo pegado al cuerpo",
          "Resistencia leve",
          "Sin compensaciones",
        ],
      },
    ],
    ownerId: null,
  },
];

// helper
function findRoutine(id) {
  return BASE_ROUTINES.find((r) => r.id === id);
}

// GET /api/routines  -> catálogo completo
router.get("/", (_req, res) => {
  res.json(BASE_ROUTINES);
});

// GET /api/routines/assigned -> IDs rutinas asignadas al usuario
router.get("/assigned", async (req, res) => {
  try {
    const userId = req.user._id;
    const progressDocs = await RoutineProgress.find({ userId }).select(
      "routineId"
    );
    const ids = [...new Set(progressDocs.map((p) => p.routineId))];
    res.json(ids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener rutinas asignadas" });
  }
});

// POST /api/routines/assign  {routineId}
router.post("/assign", async (req, res) => {
  try {
    const userId = req.user._id;
    const { routineId } = req.body;

    const routine = findRoutine(routineId);
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const totalDays = routine.days?.length || 3;

    const daysDone = Array.from({ length: totalDays }, () => false);

    const doc = await RoutineProgress.findOneAndUpdate(
      { userId, routineId },
      { $setOnInsert: { daysDone, history: [], completedAt: null } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, progress: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al asignar rutina" });
  }
});

// GET /api/routines/progress -> todos los progresos del usuario
router.get("/progress", async (req, res) => {
  try {
    const userId = req.user._id;
    const docs = await RoutineProgress.find({ userId }).lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener progreso" });
  }
});

// POST /api/routines/progress
// body: { routineId, dayIndex, totalDays, exerciseName }
router.post("/progress", async (req, res) => {
  try {
    const userId = req.user._id;
    const { routineId, dayIndex, totalDays, exerciseName } = req.body;

    if (routineId == null || dayIndex == null) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const today = new Date();
    const dstr = today.toISOString().slice(0, 10);

    const doc = await RoutineProgress.findOne({ userId, routineId });

    let daysDone;
    if (doc) {
      daysDone = doc.daysDone;
      // asegurar largo
      while (daysDone.length < totalDays) daysDone.push(false);
    } else {
      daysDone = Array.from({ length: totalDays }, () => false);
    }

    daysDone[dayIndex] = true;

    const historyEntry = { date: dstr, dayIndex, exerciseName };

    const allDone = daysDone.every(Boolean);
    const completedAt = allDone
      ? doc?.completedAt || today
      : doc?.completedAt || null;

    const updated = await RoutineProgress.findOneAndUpdate(
      { userId, routineId },
      {
        userId,
        routineId,
        daysDone,
        completedAt,
        $push: { history: historyEntry },
      },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar progreso" });
  }
});

module.exports = router;
