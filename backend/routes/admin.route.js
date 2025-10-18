import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  changeUserPassword, 
  getPendingUsers,
  acceptUser,
  getAllShiftRequests,
  updateShiftRequestStatus,
  deleteUser
} from '../controllers/admin.controller.js';
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.get('/users', protectRoute, adminRoute, getAllUsers);
router.get('/users/pending', protectRoute, adminRoute, getPendingUsers);
router.put('/users/:userId/accept', protectRoute, adminRoute, acceptUser);
router.get('/users/:id', protectRoute, adminRoute, getUserById);
router.post('/users', protectRoute, adminRoute, createUser);
router.put('/users/:id', protectRoute, adminRoute, updateUser);
router.patch('/users/:id/password', protectRoute, adminRoute, changeUserPassword);
router.delete('/users/:id', protectRoute, adminRoute, deleteUser);

// Shift request routes (FIXED)
router.get('/shift-requests', protectRoute, adminRoute, getAllShiftRequests);
router.patch('/shift-requests/:requestId', protectRoute, adminRoute, updateShiftRequestStatus);

export default router;