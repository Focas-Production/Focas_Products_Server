// routes/delivery.js
import express from "express"
import { adminAuth } from "../middleware/auth.js"
import {
  getShipments,
  trackShipment,
  getLabel,
  delhiveryWebhook,
} from "../controllers/delhiveryController.js"

const router = express.Router();

// Public — Delhivery calls this for real-time status updates
router.post('/webhook', delhiveryWebhook);

// Admin-protected
router.use(adminAuth);

// Dashboard — all orders with shipment status
router.get('/shipments', getShipments);

// Track & label
router.get('/track/:awb', trackShipment);
router.get('/label/:awb', getLabel);

export default router;
