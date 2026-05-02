import mongoose from "mongoose";

/* ---------- Profile ---------- */
const ProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    whatsapp: {
      type: String,
      required: true,
    },
    attemptNumber: { type: Number, required: true, min: 1 },
    examType: {
      type: String,

      required: true
    },
    weakSubjects: { type: [String], default: [] }
  },
  { _id: false }
);

/* ---------- Results ---------- */
const ResultSchema = new mongoose.Schema(
  {
    score: Number,
    passed: Boolean,
    examinerFinalRemark: String,
    effortVsQualityGap: Number,
    penaltiesApplied: { type: Array, default: [] },
    breakdown: { type: Array, default: [] },
    beliefReckoning: { type: Array, default: [] }
  },
  { _id: false }
);

/* ---------- Outcome ---------- */
const OutcomeSchema = new mongoose.Schema(
  {
    endingType: String,
    lastAttemptProbability: Number,
    patternStrength: String,
    interpretation: String,
    controlScore: Number,
    prepQualityRank: Number,
    positiveContributor: String,
    negativeContributor: String
  },
  { _id: false }
);

/* ---------- Stats / Patterns / Penalties ---------- */
const GenericObject = { type: Object, default: {} };

/* ---------- Main Schema ---------- */
const GameSessionSchema = new mongoose.Schema(
  {
    profile: { type: ProfileSchema, required: true },

    weakSubjectLabels: { type: [String], default: [] },

    // saved later ⬇
    results: ResultSchema,
    outcome: OutcomeSchema,
    stats: GenericObject,
    patterns: GenericObject,
    penalties: GenericObject,
    beliefs: GenericObject,
    history: { type: Array, default: [] },

    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

/* ---------- Index ---------- */
GameSessionSchema.index(
  { "profile.whatsapp": 1, "profile.attemptNumber": 1 },
  { unique: true }
);
const GameSession = mongoose.model("GameSession", GameSessionSchema);

export default GameSession;
