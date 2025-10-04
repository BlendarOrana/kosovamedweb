// routes/notification.route.js
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
  updateUserPushToken,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeUserPushToken
} from '../controllers/notification.controller.js';

const router = express.Router();

router.post('/push-token', protectRoute, updateUserPushToken);

router.delete('/push-token', protectRoute, removeUserPushToken);

// Matches GET /api/notifications
router.get('/', protectRoute, getUserNotifications);

// Matches PATCH /api/notifications/:id/read
router.patch('/:id/read', protectRoute, markNotificationAsRead);

// Matches PATCH /api/notifications/read-all
router.patch('/read-all', protectRoute, markAllNotificationsAsRead);

export default router;