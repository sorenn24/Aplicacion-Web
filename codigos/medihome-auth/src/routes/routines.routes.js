// src/routes/routines.routes.js
const express = require("express");
const router = express.Router();

const AssignedRoutine = require("../models/AssignedRoutine");
const Progress = require("../models/Progress");
const { auth } = require("../middleware/auth");

// ===============================
// GET /api/routines/assigned
// Rutinas asignadas al usuario actual (solo IDs)
// ===============================
router.get("/assigned", auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const assigned = await AssignedRoutine.find({ userId });

    // devolvemos sólo un arreglo de ids de rutina
    const routineIds = assigned.map((a) => a.routineId);
    res.json(routineIds);
  } catch (err) {
    console.error("Error GET /assigned:", err);
    res.status(500).json({ message: "Error al obtener rutinas asignadas" });
  }
});

// ===============================
// POST /api/routines/assign
// Asignar una rutina al usuario actual
// body: { routineId }
// ===============================
router.post("/assign", auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { routineId } = req.body;

    if (!routineId) {
      return res.status(400).json({ message: "routineId es obligatorio" });
    }

    const existing = await AssignedRoutine.findOne({ userId, routineId });
    if (existing) {
      return res.status(200).json({ message: "La rutina ya estaba asignada" });
    }

    const created = await AssignedRoutine.create({ userId, routineId });
    res.status(201).json(created);
  } catch (err) {
    console.error("Error POST /assign:", err);
    res.status(500).json({ message: "Error al asignar rutina" });
  }
});

// ===============================
// GET /api/routines/progress
// Progreso de todas las rutinas del usuario actual
// ===============================
router.get("/progress", auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const records = await Progress.find({ userId });
    res.json(records);
  } catch (err) {
    console.error("Error GET /progress:", err);
    res.status(500).json({ message: "Error al obtener progreso" });
  }
});

// ===============================
// POST /api/routines/progress
// Marcar un día como completado
// body: { routineId, dayIndex, totalDays, exerciseName }
// ===============================
router.post("/progress", auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { routineId, dayIndex, totalDays, exerciseName } = req.body;

    if (routineId == null || dayIndex == null || totalDays == null) {
      return res.status(400).json({ message: "Datos incompletos para progreso" });
    }

    let prog = await Progress.findOne({ userId, routineId });

    if (!prog) {
      // inicializa estructura
      prog = await Progress.create({
        userId,
        routineId,
        daysDone: Array.from({ length: totalDays }, () => false),
        completedDate: null,
        history: [],
      });
    }

    // si el arreglo daysDone es más corto, lo ajustamos
    if (prog.daysDone.length < totalDays) {
      const diff = totalDays - prog.daysDone.length;
      prog.daysDone = prog.daysDone.concat(Array.from({ length: diff }, () => false));
    }

    prog.daysDone[dayIndex] = true;

    const today = new Date();
    const dstr = today.toISOString().slice(0, 10);
    prog.history.push({
      date: dstr,
      dayIndex,
      exerciseName: exerciseName || `Día ${dayIndex + 1}`,
    });

    if (prog.daysDone.every(Boolean) && !prog.completedDate) {
      prog.completedDate = today;
    }

    await prog.save();
    res.json(prog);
  } catch (err) {
    console.error("Error POST /progress:", err);
    res.status(500).json({ message: "Error al guardar progreso" });
  }
});

module.exports = router;
