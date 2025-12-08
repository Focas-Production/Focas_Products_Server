import Razorpay from "razorpay";
import crypto from "crypto"
import RTI from "../models/CAStudentRTI.js"
import AuditCrashCourse from "../models/AuditCrashCourse.js"
import PlannerKit from "../models/PlannerKit.js";
import dotenv from "dotenv"
dotenv.config()

// Initialize Razorpay Client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



//RTI PAYMENT CONTROLLERS
// CREATE ORDER

const RTI_PRICES = {
  PER_PAPER: 350,
  PER_GROUP: 800,
  BOTH_GROUPS: 1500,
};

// =============================
// CREATE ORDER
// =============================
const rtiCreateOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      sro,
      caLevel,
      previousAttempt,
      rtiLink,
      locationOfResidence,
      paymentOption,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNumber || !sro || !caLevel || !previousAttempt || !rtiLink || !locationOfResidence || !paymentOption) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Validate paymentOption enum
   const VALID_PAYMENT_OPTIONS = ["PER_PAPER", "PER_GROUP", "BOTH_GROUPS"];

   if (!VALID_PAYMENT_OPTIONS.includes(paymentOption)) {
  return res.status(400).json({
    success: false,
    error: "Invalid payment option",
   });
   }

    // Secure backend amount
    const amount = RTI_PRICES[paymentOption];
    if (!amount) {
      return res.status(400).json({ success: false, error: "Invalid payment option" });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "RTI_" + Date.now(),
    });

    res.json({
      success: true,
      message: "Order created successfully",
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      amount,
      userData: {
        name,
        email,
        phoneNumber,
        sro,
        caLevel,
        previousAttempt,
        rtiLink,
        locationOfResidence,
        paymentOption,
      },
    });
  } catch (err) {
    console.error("RTI Create Order Error:", err);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
};

// =============================
// VERIFY PAYMENT + SAVE TO DB
// =============================
const rtiVerifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      formData, // same naming pattern as audit controller
    } = req.body;

    // Step 1: signature check
    const signBody = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Signature verification failed",
      });
    }

    // Step 2: Save record after verify
    const savedRecord = await RTI.create({
      ...formData,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: RTI_PRICES[formData.paymentOption],
      currency: "INR",
    });

    res.json({
      success: true,
      message: "Payment verified & record saved successfully",
      data: savedRecord,
    });

  } catch (error) {
    console.error("RTI Verify Payment Error:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
    });
  }
};

// =============================
// GET PAYMENT HISTORY
// =============================
const rtiGetPaymentHistory = async (req, res) => {
  try {
    let {
      name,
      phoneNumber,
      email,
      orderId,
      paymentOption,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    // 🔍 Search + Filters
    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber, $options: "i" };
    if (orderId) filter.razorpayOrderId = orderId;
    if (paymentOption) filter.paymentOption = paymentOption;

    // 📅 Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // 📄 Pagination
    const skip = (page - 1) * limit;

    const results = await RTI.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RTI.countDocuments(filter);

    res.json({
      success: true,
      totalRecords: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: results,
    });

  } catch (error) {
    console.error("RTI Payment history error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment history",
    });
  }
};


/* GET /api/rti/payment-history

GET /api/rti/payment-history?name=dinesh

GET /api/rti/payment-history?phoneNumber=73055

GET /api/rti/payment-history?orderId=order_Nzqw123

GET /api/rti/payment-history?startDate=2025-01-01&endDate=2025-01-31

GET /api/rti/payment-history?page=2&limit=10 */



//AUDIT CRASH COURSE PAYMENT CONTROLLERS

// CREATE ORDER
// Backend-only secure pricing
const COURSE_PRICES = {
  AUDIT_CRASH_COURSE: 4000,
  NORMAL_COURSE: 4000,
};

const auditCourseCreateOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      sro,
      caLevel,
      previousAttempt,
      locationOfResidence,
      courseName,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNumber || !caLevel || !courseName) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    

    const VALID_COURSES = ["AUDIT_CRASH_COURSE", "NORMAL_COURSE"];

    if (!VALID_COURSES.includes(courseName)) {
      return res.status(400).json({
        success: false,
        error: "Invalid course name",
      });
    }

    const amount = COURSE_PRICES[courseName];

if (!amount) {
  return res.status(400).json({ success: false, error: "Invalid course name" });
}


    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "AUDIT_" + Date.now(),
    });

    res.json({
      success: true,
      message: "Order created successfully",
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      amount,
      userData: {
        name,
        email,
        phoneNumber,
        sro,
        caLevel,
        previousAttempt,
        locationOfResidence,
        courseName,
      },
    });
  } catch (err) {
    console.error("Create Order Error:", err);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
};
// VERIFY PAYMENT + SAVE TO DB
const auditCourseVerifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      formData, // complete user data from frontend
    } = req.body;

    // Step 1: Verify signature
    const signBody = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Signature verification failed",
      });
    }

    // Step 2: Save to DB AFTER verification
    const savedRecord = await AuditCrashCourse.create({
      ...formData,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: COURSE_PRICES[formData.courseName],
      currency: "INR",
    });

    res.json({
      success: true,
      message: "Payment verified & record saved successfully",
      data: savedRecord,
    });

  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
    });
  }
};
// GET PAYMENT HISTORY (WITH SEARCH + FILTER + PAGINATION)
const auditCourseGetPaymentHistory = async (req, res) => {
  try {
    let {
      name,
      phoneNumber,
      email,
      orderId,
      courseName,
      caLevel,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    // 🔍 Search Filters
    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber, $options: "i" };
    if (orderId) filter.razorpayOrderId = orderId;

    if (courseName) filter.courseName = courseName;
    if (caLevel) filter.caLevel = caLevel;

    // 📅 Date Range Filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // 📄 Pagination
    const skip = (page - 1) * limit;

    const results = await AuditCrashCourse.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    const total = await AuditCrashCourse.countDocuments(filter);

    res.json({
      success: true,
      totalRecords: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: results,
    });

  } catch (error) {
    console.error("Audit Payment history error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch payment history" 
    });
  }
};
//GET /api/audit-crash-course/payment-history?page=1&limit=10
//GET /api/audit-crash-course/payment-history?name=dinesh
//GET /api/audit-crash-course/payment-history?phoneNumber=73055
//GET /api/audit-crash-course/payment-history?startDate=2025-01-01&endDate=2025-02-01
//GET /api/audit-crash-course/payment-history?courseName=AUDIT_CRASH_COURSE
//GET /api/audit-crash-course/payment-history?orderId=order_Nzqw123


const PLANNER_PRICES = {
  FOCAS_PLANNER_KIT: 399, // example — change your real price
};

const plannerKitCreateOrder = async (req, res) => {
  try {
    const { name, email, phoneNumber, attempt, caLevel, address, title } = req.body;

    if (!name || !email || !phoneNumber || !attempt || !caLevel || !title) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Validate product title
    if (!PLANNER_PRICES[title]) {
      return res.status(400).json({
        success: false,
        error: "Invalid product title",
      });
    }

    const amount = PLANNER_PRICES[title];

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "PLANNER_" + Date.now(),
    });

    res.json({
      success: true,
      message: "Order created successfully",
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      amount,
      userData: {
        name,
        email,
        phoneNumber,
        attempt,
        caLevel,
        address,
        title,
      },
    });

  } catch (err) {
    console.error("PlannerKit Create Order Error:", err);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
};

const plannerKitVerifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      formData,
    } = req.body;

    // Signature verification
    const signBody = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Signature verification failed",
      });
    }

    // Save to DB only after verification
    const savedRecord = await PlannerKit.create({
      ...formData,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: PLANNER_PRICES[formData.title],
      currency: "INR",
    });

    res.json({
      success: true,
      message: "Payment verified & record saved successfully",
      data: savedRecord,
    });
  } catch (error) {
    console.error("PlannerKit Verify Error:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
    });
  }
};

const plannerKitGetOrders = async (req, res) => {
  try {
    let {
      name,
      email,
      phoneNumber,
      title,
      attempt,
      caLevel,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber, $options: "i" };
    if (title) filter.title = title;
    if (attempt) filter.attempt = attempt;
    if (caLevel) filter.caLevel = caLevel;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const results = await PlannerKit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PlannerKit.countDocuments(filter);

    res.json({
      success: true,
      totalRecords: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: results,
    });
  } catch (error) {
    console.error("PlannerKit Get Orders Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};




export default {
  rtiCreateOrder,
  rtiVerifyPayment,
  rtiGetPaymentHistory,
  auditCourseCreateOrder,
  auditCourseVerifyPayment,
  auditCourseGetPaymentHistory,
  plannerKitCreateOrder,
  plannerKitVerifyPayment,
  plannerKitGetOrders
};