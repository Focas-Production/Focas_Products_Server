import mongoose from "mongoose"

const AuditCrashCourseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },

    sro: { type: String, trim: true },
    caLevel: {
      type: String,
      enum: ["CA Foundation", "CA Intermediate", "CA Final"],
      required: true,
    },

    previousAttempt: { type: String },
    locationOfResidence: { type: String, trim: true },

    courseName: {
      type: String,
      enum: ["AUDIT_CRASH_COURSE", "NORMAL_COURSE"],
      default: "AUDIT_CRASH_COURSE",
      required: true,
    },

    // Razorpay fields
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amount: { type: Number }, // set by backend
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

const AuditCrashCourse = mongoose.model(
  "AuditCrashCourse",
  AuditCrashCourseSchema
);

export default AuditCrashCourse;
