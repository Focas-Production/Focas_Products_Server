import mongoose from "mongoose";

const PlannerKitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    title: {
      type: String,
      enum: ["FOCAS_PLANNER_KIT"],
      required: true,
      default: "FOCAS_PLANNER_KIT",
    },

    attempt: {
      type: String,
      enum: ["JAN-26", "MAY-26", "SEC-26"],
      required: true,
    },

    phoneNumber: { type: String, required: true, trim: true },

    email: { type: String, required: true, lowercase: true, trim: true },

    address: {
      fullAddress: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      landmark: { type: String, trim: true },
    },

    caLevel: {
      type: String,
      enum: ["CA Foundation", "CA Intermediate", "CA Final","N/A"],
      required: true,
      default: "N/A"
    },

    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amount: { type: Number, default: null },
    currency: { type: String, default: "INR" },
    status:{
      type:String,
      enum:["PENDING","PROCESSING","DELIVERED","SHIPPED","CANCELLED","RETURNED"],
      default:"PROCESSING"
    },
    notes:{
      type:String,
    }
  },
  { timestamps: true }
);

export default mongoose.model("PlannerKit", PlannerKitSchema);
