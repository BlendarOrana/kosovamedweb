// routes/user.route.js
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { updateUserPushToken } from '../controllers/notification.controller.js'; // You can co-locate the controller logic

const router = express.Router();

// This perfectly matches: `${API_URL}/api/users/push-token`
router.post('/push-token', protectRoute, updateUserPushToken);

export default router;