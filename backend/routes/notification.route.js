// backend/routes/notification.route.js

import express from 'express';
import { 
  sendNotificationToAll,
  sendNotificationToUser,
  sendNotificationToRole,
  
} from '../controllers/notification.controller.js';
import { protectRoute, adminRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Admin only routes
router.post('/send-all', protectRoute, adminRoute, sendNotificationToAll);
router.post('/send-role', protectRoute, adminRoute, sendNotificationToRole);
router.post('/send-user/:userId', protectRoute, adminRoute, sendNotificationToUser);

// User routes

export default router;