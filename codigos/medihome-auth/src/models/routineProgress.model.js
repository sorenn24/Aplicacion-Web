// src/models/routineProgress.model.js
const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },       // 'YYYY-MM-DD'
    dayIndex: { type: Number, required: true },   // 0,1,2...
    exerciseName: { type: String, required: true }
  },
  { _id: false }
);

const routineProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    routineId: {
      type: String,
      required: true,
    },
    daysDone: {
      type: [Boolean],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
    history: {
      type: [historySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Un progreso por usuario + rutina
routineProgressSchema.index({ userId: 1, routineId: 1 }, { unique: true });

module.exports = mongoose.model("RoutineProgress", routineProgressSchema);
