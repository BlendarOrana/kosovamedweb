import express from 'express';
import { 
  generateAttendanceReport,
  generateVacationReport,
  generateSummaryReport
} from '../controllers/reports.controller.js';
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All report routes are admin-only
router.get('/attendance-excel', protectRoute, adminRoute, generateAttendanceReport);
router.get('/vacation-excel', protectRoute, adminRoute, generateVacationReport);
router.get('/summary-excel', protectRoute, adminRoute, generateSummaryReport);

export default router;