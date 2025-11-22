// src/models/customRoutine.model.js
const mongoose = require("mongoose");

const DaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    reps: { type: String, required: true },
    duration: { type: Number, required: true },
    instructions: { type: [String], default: [] },
  },
  { _id: false }
);

const CustomRoutineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    difficulty: { type: String, required: true },
    duration: { type: Number, required: true },
    description: { type: String, required: true },
    days: { type: [DaySchema], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomRoutine", CustomRoutineSchema);
