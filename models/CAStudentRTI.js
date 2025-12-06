import mongoose from "mongoose"

const CAStudentRTISchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },
    sro: { type: String, required: true },

    caLevel: {
      type: String,
      enum: ["CA Foundation", "CA Intermediate", "CA Final"],
      required: true,
    },

    previousAttempt: { type: String, required: true },
    rtiLink: { type: String, required: true, trim: true },
    locationOfResidence: { type: String, required: true, trim: true },

    paymentOption: {
      type: String,
      enum: ["PER_PAPER", "PER_GROUP", "BOTH_GROUPS"],
      required: true,
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

const CAStudentRTI = mongoose.model("CAStudentRTI", CAStudentRTISchema);

export default CAStudentRTI
