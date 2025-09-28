import express from 'express';
import { 
  signup, 
  login, 
  mobileLogin,  // NEW: Add this import
  logout, 
  getProfile, 
  getAllUsers 
} from '../controllers/auth.controller.js';
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Existing routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', protectRoute, getProfile);
router.get('/users', protectRoute, adminRoute, getAllUsers);

// NEW: Mobile login route
router.post('/mobile-login', mobileLogin);

export default router;