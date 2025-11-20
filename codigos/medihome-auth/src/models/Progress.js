// src/models/Progress.js
const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema(
  {
    date: String,       // "YYYY-MM-DD"
    dayIndex: Number,   // 0..n
    exerciseName: String,
  },
  { _id: false }
);

const ProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    routineId: {
      type: String, // mismo id string de la rutina
      required: true,
    },
    daysDone: {
      type: [Boolean],
      default: [],
    },
    completedDate: {
      type: Date,
      default: null,
    },
    history: {
      type: [HistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Progress", ProgressSchema);
