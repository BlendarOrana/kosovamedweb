import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  changeUserPassword, 
  deleteUser} from '../controllers/admin.controller.js';
import { protectRoute,adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all users
router.get('/users', protectRoute,adminRoute, getAllUsers);

// Get a specific user
router.get('/users/:id', protectRoute,adminRoute, getUserById);

// Create a new user
router.post('/users', protectRoute,adminRoute, createUser);

// Update user details
router.put('/users/:id', protectRoute,adminRoute, updateUser);

// Change user password
router.patch('/users/:id/password', protectRoute,adminRoute, changeUserPassword);

// Delete a user
router.delete('/users/:id', protectRoute,adminRoute, deleteUser);



export default router;