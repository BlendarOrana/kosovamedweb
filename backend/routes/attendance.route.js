import express from 'express';
import { 
  checkIn,
  checkOut,
    getTodayStatus,

  getAllAttendance,
  markVacationAsSeen,
markAllVacationsAsSeen
} from '../controllers/attendance.controller.js';
import {  requestVacation, getMyVacations,getAllVacations,respondToVacation ,getAvailableReplacements,getReplacementRequests
  ,respondToReplacement,
  getManagerVacations,
managerRespondToVacation} from "../controllers/vacations.controller.js"
import { protectRoute, adminRoute,managerRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.post('/check-in', protectRoute, checkIn);
router.post('/check-out', protectRoute, checkOut);
router.get('/today-status', protectRoute, getTodayStatus);

// Add these routes to your existing router file

// Route to mark a specific vacation as seen
router.patch('/:vacationId/mark-seen', protectRoute, markVacationAsSeen);

// Route to mark all vacations as seen for the current user
router.patch('/mark-all-seen', protectRoute, markAllVacationsAsSeen);
// Admin routes
router.get('/all-attendance', protectRoute, adminRoute, getAllAttendance);


router.get('/available-replacements', protectRoute, getAvailableReplacements); // Add this
router.post('/vacation-request', protectRoute, requestVacation);
router.get('/my-vacations', protectRoute, getMyVacations);
router.get('/replacement-requests', protectRoute, getReplacementRequests);
router.patch('/replacement-response/:id', protectRoute, respondToReplacement);

// Manager routes
router.get('/manager-vacations', protectRoute, managerRoute, getManagerVacations);
router.patch('/manager-response/:id', protectRoute, managerRoute, managerRespondToVacation);

// Admin routes
router.get('/all-vacations', protectRoute, adminRoute, getAllVacations);
router.patch('/vacation-response/:id', protectRoute, adminRoute, respondToVacation);



export default router;