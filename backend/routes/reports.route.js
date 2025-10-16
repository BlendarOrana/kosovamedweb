import express from 'express';
import { 
  generateAttendanceReport,
  generateVacationReport,
  generateContractTerminationPDF,
  generateEmploymentCertificatePDF
  
} from '../controllers/reports.controller.js';
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All report routes are admin-only
router.get('/attendance-excel', protectRoute, adminRoute, generateAttendanceReport);
router.get('/vacation-excel', protectRoute, adminRoute, generateVacationReport);
router.get('/contract-termination-pdf', protectRoute, adminRoute, generateContractTerminationPDF);
router.get('/employment-certificate-pdf', protectRoute, adminRoute, generateEmploymentCertificatePDF);

export default router;