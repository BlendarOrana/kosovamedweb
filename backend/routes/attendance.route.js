import express from 'express';
import { 
  checkIn,
  checkOut,
  getMyAttendance,
  requestVacation,
  getMyVacations,
  getAllAttendance,
  getAllVacations,
  respondToVacation,
  markVacationAsSeen,
markAllVacationsAsSeen
} from '../controllers/attendance.controller.js';
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.post('/check-in', protectRoute, checkIn);
router.post('/check-out', protectRoute, checkOut);
router.get('/my-attendance', protectRoute, getMyAttendance);
router.post('/vacation-request', protectRoute, requestVacation);
router.get('/my-vacations', protectRoute, getMyVacations);

// Add these routes to your existing router file

// Route to mark a specific vacation as seen
router.patch('/:vacationId/mark-seen', protectRoute, markVacationAsSeen);

// Route to mark all vacations as seen for the current user
router.patch('/mark-all-seen', protectRoute, markAllVacationsAsSeen);
// Admin routes
router.get('/all-attendance', protectRoute, adminRoute, getAllAttendance);
router.get('/all-vacations', protectRoute, adminRoute, getAllVacations);
router.patch('/vacation-response/:id', protectRoute, adminRoute, respondToVacation);

export default router;