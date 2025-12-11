import express from "express";
import paymentController from "../controllers/paymentController.js"
import { protect, requireRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// RTI Payment Routes

// Create Razorpay order
router.post('/rti/create-order',paymentController.rtiCreateOrder);

// Verify payment 
router.post('/rti/verify-payment', paymentController.rtiVerifyPayment);

// Get payment history
router.get('/rti/payment-history',protect, requireRoles('admin', 'superadmin'),  paymentController.rtiGetPaymentHistory); 

router.put('/rti/status/:id',protect, requireRoles('admin', 'superadmin'),paymentController.updateRtiStatus);


// Audit Crash Course Routes

// Create Razorpay order
router.post('/audit-crash-course/create-order',paymentController.auditCourseCreateOrder);

// Verify payment 
router.post('/audit-crash-course/verify-payment',paymentController.auditCourseVerifyPayment);

// Get payment history
router.get('/audit-crash-course/payment-history',protect, requireRoles('admin', 'superadmin'),paymentController.auditCourseGetPaymentHistory); 





// Audit Crash Course Routes

// Create Razorpay order
router.post('/planner/create-order',paymentController.plannerKitCreateOrder);

// Verify payment 
router.post('/planner/verify-payment',paymentController.plannerKitVerifyPayment);

// Get payment history
router.get('/planner/payment-history',protect, requireRoles('admin', 'superadmin'),paymentController.plannerKitGetOrders); 

// Edit Planner status and notes

router.put('/planner/status/:id',protect, requireRoles('admin', 'superadmin'),paymentController.updatePlannerKitStatus);

export default router