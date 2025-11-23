// src/routes/routines.routes.js
const express = require("express");
const RoutineProgress = require("../models/routineProgress.model");
const CustomRoutine = require("../models/customRoutine.model");

const router = express.Router();

// ======================= CATÁLOGO BASE =======================

 const BASE_ROUTINES = [
  {
    id: "rtn-knee",
    name: "Rehabilitación de Rodilla",
    category: "Piernas",
    difficulty: "Principiante",
    duration: 15,
    description: "Rutina básica para movilidad y activación de rodilla.",
    days: [
      {
        name: "Flexión y extensión asistida",
        reps: "10 rep x 3",
        duration: 5,
        instructions: [
          "Sentado, estira la rodilla",
          "Mantén 2–3 s",
          "Regresa despacio",
        ],
      },
      {
        name: "Elevación de pierna recta",
        reps: "10 rep x 3",
        duration: 5,
        instructions: ["Pierna recta", "Eleva 45°", "Mantén 3 s"],
      },
      {
        name: "Cuádriceps isométrico",
        reps: "12 rep x 3",
        duration: 5,
        instructions: ["Aprieta cuádriceps", "Mantén 5 s"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-neck",
    name: "Rehabilitación de Cuello",
    category: "Cuello",
    difficulty: "Intermedio",
    duration: 15,
    description: "Movilidad cervical controlada para reducir tensión.",
    days: [
      {
        name: "Inclinaciones laterales",
        reps: "10 rep por lado",
        duration: 5,
        instructions: ["Inclina a hombro", "Mantén 5 s"],
      },
      {
        name: "Rotaciones controladas",
        reps: "10 rep por lado",
        duration: 5,
        instructions: ["Gira suave", "No forzar el rango"],
      },
      {
        name: "Retracciones cervicales",
        reps: "10 rep",
        duration: 5,
        instructions: ["Lleva barbilla atrás", "Mantén 3 s"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-elbow",
    name: "Rehabilitación de Codo",
    category: "Brazos",
    difficulty: "Principiante",
    duration: 15,
    description: "Movilidad básica de codo sin dolor.",
    days: [
      {
        name: "Flexo-extensión",
        reps: "15 rep x 3",
        duration: 5,
        instructions: ["Flexiona y extiende", "Movimiento suave"],
      },
      {
        name: "Pronosupinación",
        reps: "10 rep x 3",
        duration: 5,
        instructions: ["Giro suave", "Sin dolor"],
      },
      {
        name: "Agarre isométrico",
        reps: "10 rep",
        duration: 5,
        instructions: ["Aprieta suave", "Mantén 5 s"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-shoulder",
    name: "Rehabilitación de Hombro",
    category: "Brazos",
    difficulty: "Intermedio",
    duration: 18,
    description: "Ejercicios para mejorar movilidad y estabilidad del hombro.",
    days: [
      {
        name: "Elevaciones frontales",
        reps: "10 rep x 3",
        duration: 6,
        instructions: ["Brazos al frente", "Controla descenso"],
      },
      {
        name: "Rotación externa con banda",
        reps: "12 rep x 3",
        duration: 6,
        instructions: ["Codo pegado", "Gira hacia fuera"],
      },
      {
        name: "Péndulo",
        reps: "1 min por lado",
        duration: 6,
        instructions: ["Inclínate", "Balancea suave"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-lowerback",
    name: "Rehabilitación de Espalda Baja",
    category: "Espalda",
    difficulty: "Principiante",
    duration: 15,
    description: "Rutina suave para dolor lumbar y movilidad.",
    days: [
      {
        name: "Rodillas al pecho",
        reps: "5×20s",
        duration: 5,
        instructions: ["Rodillas al pecho", "Mantén suave"],
      },
      {
        name: "Gato–camello",
        reps: "10 rep x 2",
        duration: 5,
        instructions: ["Flexión/Extensión suave"],
      },
      {
        name: "Puente glúteo",
        reps: "12 rep x 3",
        duration: 5,
        instructions: ["Activa core", "Eleva pelvis"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-abs",
    name: "Abdominal Terapéutico",
    category: "Core",
    difficulty: "Intermedio",
    duration: 15,
    description: "Activación de core profundo sin impacto.",
    days: [
      {
        name: "Activación transverso",
        reps: "5×10s",
        duration: 5,
        instructions: ["Inhala", "Contrae abdomen"],
      },
      {
        name: "Dead bug",
        reps: "10 rep por lado",
        duration: 5,
        instructions: ["Alterna brazos/piernas", "Control total"],
      },
      {
        name: "Plancha modificada",
        reps: "3×20s",
        duration: 5,
        instructions: ["Apoya rodillas", "Columna neutra"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-hip",
    name: "Rehabilitación de Cadera",
    category: "Piernas",
    difficulty: "Intermedio",
    duration: 18,
    description: "Movilidad y fortalecimiento de cadera.",
    days: [
      {
        name: "Abducción lateral",
        reps: "12 rep x 3",
        duration: 6,
        instructions: ["De lado", "Eleva pierna"],
      },
      {
        name: "Puente una pierna",
        reps: "10 rep por lado",
        duration: 6,
        instructions: ["Alterna piernas", "Eleva pelvis"],
      },
      {
        name: "Paso lateral con banda",
        reps: "3×10 m",
        duration: 6,
        instructions: ["Banda en tobillos", "Laterales"],
      },
    ],
    ownerId: null,
  },

  {
    id: "rtn-ankle",
    name: "Rehabilitación de Tobillo",
    category: "Piernas",
    difficulty: "Principiante",
    duration: 12,
    description: "Control de movilidad del tobillo sin dolor.",
    days: [
      {
        name: "Abecedario con pie",
        reps: "A–Z x 2",
        duration: 4,
        instructions: ["Movimiento suave"],
      },
      {
        name: "Elevación de talones",
        reps: "15 rep x 3",
        duration: 4,
        instructions: ["De puntillas", "Sostén 1 s"],
      },
      {
        name: "Inversión/Eversión banda",
        reps: "10 rep x 2",
        duration: 4,
        instructions: ["Banda en pie", "Adentro/afuera"],
      },
    ],
    ownerId: null,
  },
];

// ===== Helper para buscar rutina en catálogo base o BD =====
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
    console.error("❌ Error al obtener rutinas:", err);
    res.status(500).json({ message: "Error al obtener rutinas" });
  }
});

// GET /api/routines/assigned -> IDs rutinas asignadas al usuario
router.get("/assigned", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const progressDocs = await RoutineProgress.find({ userId }).select(
      "routineId"
    );
    const ids = [...new Set(progressDocs.map((p) => p.routineId))];
    res.json(ids);
  } catch (err) {
    console.error("❌ Error al obtener rutinas asignadas:", err);
    res.status(500).json({ message: "Error al obtener rutinas asignadas" });
  }
});

// POST /api/routines/assign  {routineId}
router.post("/assign", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
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
    console.error("❌ Error al asignar rutina:", err);
    res.status(500).json({ message: "Error al asignar rutina" });
  }
});

// GET /api/routines/progress -> todos los progresos del usuario
router.get("/progress", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const docs = await RoutineProgress.find({ userId }).lean();
    res.json(docs);
  } catch (err) {
    console.error("❌ Error al obtener progreso:", err);
    res.status(500).json({ message: "Error al obtener progreso" });
  }
});

// POST /api/routines/progress
// body: { routineId, dayIndex, totalDays, exerciseName }
router.post("/progress", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { routineId, dayIndex, totalDays, exerciseName } = req.body;

    if (routineId == null || dayIndex == null) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const today = new Date();
    const dstr = today.toISOString().slice(0, 10);

    const doc = await RoutineProgress.findOne({ userId, routineId });

    const routine = await findAnyRoutine(routineId);
    const total =
      totalDays || (routine && routine.days ? routine.days.length : 3);

    let daysDone;
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
    console.error("❌ Error al actualizar progreso:", err);
    res.status(500).json({ message: "Error al actualizar progreso" });
  }
});

// ======================= RUTINAS TERAPEUTA =======================

// GET /api/routines/therapist/mine -> rutinas creadas por este terapeuta
router.get("/therapist/mine", async (req, res) => {
  try {
    const therapistId = req.user._id || req.user.id;
    const docs = await CustomRoutine.find({ ownerId: therapistId }).lean();

    const mapped = docs.map((r) => ({
      ...r,
      id: r._id.toString(),
    }));

    res.json(mapped);
  } catch (err) {
    console.error("❌ Error al obtener rutinas del terapeuta:", err);
    res.status(500).json({ message: "Error al obtener rutinas del terapeuta" });
  }
});

// GET /api/routines/therapist/summary -> métricas panel terapeuta
router.get("/therapist/summary", async (req, res) => {
  try {
    const therapistId = req.user._id || req.user.id;

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
    console.error("❌ Error al obtener resumen del terapeuta:", err);
    res
      .status(500)
      .json({ message: "Error al obtener resumen del terapeuta" });
  }
});

// POST /api/routines  -> crear rutina nueva (terapeuta)
router.post("/", async (req, res) => {
  try {
    const therapistId = req.user._id || req.user.id;

    if (!therapistId) {
      console.error("❌ POST /api/routines llegó sin req.user");
      return res
        .status(500)
        .json({ message: "Error de sesión en el servidor" });
    }

    const { name, category, difficulty, duration, description, days } = req.body;

    // Validación sencilla
    if (
      !name ||
      !category ||
      !difficulty ||
      !description ||
      duration == null ||
      !Array.isArray(days) ||
      !days.length
    ) {
      return res
        .status(400)
        .json({ message: "Datos incompletos para crear la rutina" });
    }

    const normalizedDays = days.map((d) => ({
      name: d.name || "Ejercicio",
      reps: d.reps || "",
      duration: Number(d.duration) || 5,
      instructions: Array.isArray(d.instructions) ? d.instructions : [],
    }));

    const doc = await CustomRoutine.create({
      name,
      category,
      difficulty,
      duration: Number(duration),
      description,
      days: normalizedDays,
      ownerId: therapistId,
    });

    res.status(201).json({
      ...doc.toObject(),
      id: doc._id.toString(),
    });
  } catch (err) {
    console.error("❌ Error al crear rutina:", err);
    res.status(500).json({
      message: err.message || "Error al crear rutina",
    });
  }
});

// PUT /api/routines/:id  -> editar rutina creada
router.put("/:id", async (req, res) => {
  try {
    const therapistId = req.user._id || req.user.id;
    const { id } = req.params;

    const routine = await CustomRoutine.findOne({
      _id: id,
      ownerId: therapistId,
    });

    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const { name, category, difficulty, duration, description, days } = req.body;

    routine.name = name || routine.name;
    routine.category = category || routine.category;
    routine.difficulty = difficulty || routine.difficulty;
    routine.duration =
      duration != null ? Number(duration) : routine.duration;
    routine.description = description || routine.description;
    if (Array.isArray(days) && days.length) {
      routine.days = days.map((d) => ({
        name: d.name || "Ejercicio",
        reps: d.reps || "",
        duration: Number(d.duration) || 5,
        instructions: Array.isArray(d.instructions) ? d.instructions : [],
      }));
    }

    await routine.save();

    res.json({
      ...routine.toObject(),
      id: routine._id.toString(),
    });
  } catch (err) {
    console.error("❌ Error al actualizar rutina:", err);
    res.status(500).json({ message: "Error al actualizar rutina" });
  }
});

// DELETE /api/routines/:id -> eliminar rutina creada
router.delete("/:id", async (req, res) => {
  try {
    const therapistId = req.user._id || req.user.id;
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
    console.error("❌ Error al eliminar rutina:", err);
    res.status(500).json({ message: "Error al eliminar rutina" });
  }
});

module.exports = router;
