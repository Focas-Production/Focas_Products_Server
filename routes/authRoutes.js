import express from 'express';
import {
login,
createSuperAdmin,
bootstrapSuperAdmin,
createAdmin
} from '../controllers/authController.js';
import { protect, requireRoles } from '../middlewares/authMiddleware.js';


const router = express.Router();


// Password login
router.post('/login', login);

// Admin management
router.post('/super-admin/bootstrap', bootstrapSuperAdmin);
router.post('/super-admin', protect, requireRoles('admin', 'superadmin'), createSuperAdmin);
router.post('/admin', protect, requireRoles('superadmin'), createAdmin);


export default router;
