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
  deleteUser} from '../controllers/admin.controller.js';
import { protectRoute,adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all users
router.get('/users', protectRoute,adminRoute, getAllUsers);


router.get('/users/pending', protectRoute,adminRoute, getPendingUsers);
router.put('/users/:userId/accept', protectRoute,adminRoute, acceptUser);

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




router.get('/shift-requests/all', protectRoute,adminRoute,getAllShiftRequests );
router.patch('/shift-requests/update/:requestId', protectRoute,adminRoute, updateShiftRequestStatus);



export default router;