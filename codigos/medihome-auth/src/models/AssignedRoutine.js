// src/models/AssignedRoutine.js
const mongoose = require("mongoose");

const AssignedRoutineSchema = new mongoose.Schema(
  {
    // Usamos el id del usuario tal como viene en el JWT (string)
    userId: {
      type: String,
      required: true,
    },
    // id de la rutina tal como la tienes en el JSON: "rtn-espalda-lumbar-suave", etc.
    routineId: {
      type: String,
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AssignedRoutine", AssignedRoutineSchema);
