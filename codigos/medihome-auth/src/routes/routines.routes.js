// src/routes/routines.routes.js
const express = require("express");
const RoutineProgress = require("../models/routineProgress.model");
const CustomRoutine = require("../models/customRoutine.model");

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

// ===== Helpers =====
async function findAnyRoutine(routineId) {
  // 1) catálogo base
  const base = BASE_ROUTINES.find((r) => r.id === routineId);
  if (base) return { ...base, isCustom: false };

  // 2) creadas por terapeuta en BD
  const custom = await CustomRoutine.findById(routineId).lean();
  if (custom) {
    return {
      ...custom,
      id: custom._id.toString(),
      isCustom: true,
    };
  }

  return null;
}

// ======================= RUTINAS (PACIENTE) =======================

// GET /api/routines  -> catálogo completo (base + personalizadas)
router.get("/", async (_req, res) => {
  try {
    const custom = await CustomRoutine.find().lean();

    const mappedCustom = custom.map((r) => ({
      ...r,
      id: r._id.toString(),
    }));

    res.json([...BASE_ROUTINES, ...mappedCustom]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener rutinas" });
  }
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

    const routine = await findAnyRoutine(routineId);
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
    const total = totalDays || (await findAnyRoutine(routineId))?.days?.length || 3;

    if (doc) {
      daysDone = doc.daysDone || [];
      while (daysDone.length < total) daysDone.push(false);
    } else {
      daysDone = Array.from({ length: total }, () => false);
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

// ======================= RUTINAS TERAPEUTA =======================

// GET /api/routines/therapist/mine -> rutinas creadas por este terapeuta
router.get("/therapist/mine", async (req, res) => {
  try {
    const therapistId = req.user._id;
    const docs = await CustomRoutine.find({ ownerId: therapistId }).lean();

    const mapped = docs.map((r) => ({
      ...r,
      id: r._id.toString(),
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener rutinas del terapeuta" });
  }
});

// GET /api/routines/therapist/summary -> métricas panel terapeuta
router.get("/therapist/summary", async (req, res) => {
  try {
    const therapistId = req.user._id;

    const routines = await CustomRoutine.find({ ownerId: therapistId }).lean();
    const routineIds = routines.map((r) => r._id.toString());

    const progressDocs = await RoutineProgress.find({
      routineId: { $in: routineIds },
    }).lean();

    const totalCreated = routines.length;

    const activePatients = new Set(
      progressDocs.map((p) => p.userId.toString())
    ).size;

    const completedRoutines = progressDocs.filter((doc) => {
      if (!Array.isArray(doc.daysDone) || !doc.daysDone.length) return false;
      return doc.daysDone.every((v) => v === true);
    }).length;

    const totalAssigned = progressDocs.length;
    const successRate = totalAssigned
      ? Math.round((completedRoutines / totalAssigned) * 100)
      : 0;

    res.json({
      totalCreated,
      activePatients,
      completedRoutines,
      successRate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener resumen del terapeuta" });
  }
});

// POST /api/routines  -> crear rutina nueva (terapeuta)
router.post("/", async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { name, category, difficulty, duration, description, days } = req.body;

    const doc = await CustomRoutine.create({
      name,
      category,
      difficulty,
      duration,
      description,
      days,
      ownerId: therapistId,
    });

    res.status(201).json({
      ...doc.toObject(),
      id: doc._id.toString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear rutina" });
  }
});

// PUT /api/routines/:id  -> editar rutina creada
router.put("/:id", async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;

    const routine = await CustomRoutine.findOne({
      _id: id,
      ownerId: therapistId,
    });

    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const { name, category, difficulty, duration, description, days } = req.body;

    routine.name = name;
    routine.category = category;
    routine.difficulty = difficulty;
    routine.duration = duration;
    routine.description = description;
    routine.days = days;

    await routine.save();

    res.json({
      ...routine.toObject(),
      id: routine._id.toString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar rutina" });
  }
});

// DELETE /api/routines/:id -> eliminar rutina creada
router.delete("/:id", async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;

    const routine = await CustomRoutine.findOneAndDelete({
      _id: id,
      ownerId: therapistId,
    });

    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    // Opcional: borrar progresos relacionados
    await RoutineProgress.deleteMany({ routineId: id });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar rutina" });
  }
});

module.exports = router;
