// backend/routes/auth.route.js

import express from 'express';
import { 
  signup, 
  login, 
  mobileLogin,
  logout, 
  getProfile, 
  getAllUsers,
  getTitles,
  getRegions
} from '../controllers/auth.controller.js';
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Existing routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', protectRoute, logout);  
router.get('/profile', protectRoute, getProfile);
router.get('/users', protectRoute, adminRoute, getAllUsers);

// Mobile routes
router.post('/mobile-login', mobileLogin);

// NEW: FCM token update route

export default router;