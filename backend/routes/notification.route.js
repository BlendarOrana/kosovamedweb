// routes/notification.route.js
import express from 'express';
import { protectRoute,adminRoute } from '../middleware/auth.middleware.js';
import {
  updateUserPushToken,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeUserPushToken,
  sendNotificationToUser,
  getNotificationStats,
  sendNotificationToAll,
  sendBatchNotifications,
  sendNotificationByName

  
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


router.post('/send', protectRoute, adminRoute, sendNotificationToUser);

router.post('/send-by-name', protectRoute, adminRoute, sendNotificationByName);
router.post('/send-batch', protectRoute, adminRoute, sendBatchNotifications);
router.post('/send-all', protectRoute, adminRoute, sendNotificationToAll);
router.get('/stats', protectRoute, adminRoute, getNotificationStats);


export default router;