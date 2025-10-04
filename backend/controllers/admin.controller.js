import bcrypt from 'bcryptjs';
import { promisePool } from "../lib/db.js";
import { uploadToS3, deleteFromS3, getCloudFrontUrl } from '../lib/s3.js';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for contracts'));
    }
  }
});

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const result = await promisePool.query(`
      SELECT id, name, number, role, active, region, title, contract_url, email
      FROM users
      ORDER BY id DESC
    `);
    
    // Process CloudFront URLs for contract_url
    const users = result.rows.map(user => ({
      ...user,
      contract_url: user.contract_url ? getCloudFrontUrl(user.contract_url) : null
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await promisePool.query(`
      SELECT id, name, number, role, active, region, title, contract_url, email
      FROM users
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    // Process CloudFront URL for contract_url
    user.contract_url = user.contract_url ? getCloudFrontUrl(user.contract_url) : null;
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new user
export const createUser = async (req, res) => {
  // Use multer to handle file upload first
  upload.single('contract')(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    const { 
      name, 
      password, 
      number, 
      role, 
      active,
      region,
      title,
      email
    } = req.body;

    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Set default values for optional fields
      const isActive = active !== undefined ? active : true;
      const userRole = role || 'shop';
      
      let contractKey = null;
      
      // Handle contract PDF upload if file exists
      if (req.file) {
        const key = `contracts/${Date.now()}-${req.file.originalname}`;
        
        const uploadResult = await uploadToS3(
          req.file.buffer,
          key,
          req.file.originalname,
          req.file.mimetype,
          false // Don't process PDFs as images
        );
        
        contractKey = uploadResult.Key;
      }
      
      // Insert the new user
      const result = await promisePool.query(`
        INSERT INTO users (name, password, number, role, active, region, title, contract_url, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, number, role, active, region, title, contract_url, email
      `, [name, hashedPassword, number, userRole, isActive, region, title, contractKey, email]);
      
      const newUser = result.rows[0];
      // Process CloudFront URL for response
      newUser.contract_url = newUser.contract_url ? getCloudFrontUrl(newUser.contract_url) : null;
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};

// Update a user
export const updateUser = async (req, res) => {
  // Use multer to handle file upload first
  upload.single('contract')(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    const { id } = req.params;
    const { 
      name, 
      number, 
      role, 
      active,
      region,
      title,
      email
    } = req.body;
    
    try {
      // Get current user data to check for existing contract
      const currentUser = await promisePool.query(
        'SELECT contract_url FROM users WHERE id = $1',
        [id]
      );
      
      if (currentUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const oldContractKey = currentUser.rows[0].contract_url;
      let contractKey = oldContractKey;
      
      // Handle contract PDF upload if new file exists
      if (req.file) {
        const key = `contracts/${Date.now()}-${req.file.originalname}`;
        
        const uploadResult = await uploadToS3(
          req.file.buffer,
          key,
          req.file.originalname,
          req.file.mimetype,
          false // Don't process PDFs as images
        );
        
        contractKey = uploadResult.Key;
        
        // Delete old contract from S3 if it exists and is different
        if (oldContractKey && oldContractKey !== contractKey) {
          await deleteFromS3(oldContractKey);
        }
      }
      
      // Update the user
      const result = await promisePool.query(`
        UPDATE users
        SET name = $1, number = $2, role = $3, active = $4, region = $5, title = $6, contract_url = $7, email = $8
        WHERE id = $9
        RETURNING id, name, number, role, active, region, title, contract_url, email
      `, [name, number, role, active, region, title, contractKey, email, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const updatedUser = result.rows[0];
      // Process CloudFront URL for response
      updatedUser.contract_url = updatedUser.contract_url ? getCloudFrontUrl(updatedUser.contract_url) : null;
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};

// Change user password
export const changeUserPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update only the password
    const result = await promisePool.query(`
      UPDATE users
      SET password = $1
      WHERE id = $2
      RETURNING id
    `, [hashedPassword, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    // First check if the user exists and get contract URL
    const checkResult = await promisePool.query(
      'SELECT id, contract_url FROM users WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete contract from S3 if it exists
    const contractKey = checkResult.rows[0].contract_url;
    if (contractKey) {
      await deleteFromS3(contractKey);
    }
    
    // Delete the user
    await promisePool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Keep the delivery-related functions unchanged
export const getUnreadDeliveriesCount = async (req, res) => {
  try {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM deliveries 
      WHERE read_by_admin = false
    `;

    const result = await promisePool.query(countQuery);
    const count = parseInt(result.rows[0].count);

    return res.json({
      success: true,
      count: count
    });

  } catch (error) {
    console.error("Error fetching unread deliveries count:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markDeliveriesAsRead = async (req, res) => {
  try {
    const { deliveryIds } = req.body; 

    let query;
    let values;

    if (deliveryIds && deliveryIds.length > 0) {
      const placeholders = deliveryIds.map((_, index) => `$${index + 1}`).join(',');
      query = `
        UPDATE deliveries 
        SET read_by_admin = true 
        WHERE id IN (${placeholders}) AND read_by_admin = false
      `;
      values = deliveryIds;
    } else {
      query = `
        UPDATE deliveries 
        SET read_by_admin = true 
        WHERE read_by_admin = false
      `;
      values = [];
    }

    const result = await promisePool.query(query, values);
    const updatedCount = result.rowCount;

    return res.json({
      success: true,
      message: `${updatedCount} deliveries marked as read`,
      updatedCount: updatedCount
    });

  } catch (error) {
    console.error("Error marking deliveries as read:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// backend/controllers/auth.controller.js
// Add this function to your existing auth.controller.js

export const updatePushToken = async (req, res) => {
  try {
    const userId = req.userId; // From your auth middleware
    const { push_token, device_type } = req.body;

    if (!push_token) {
      return res.status(400).json({ message: "Push token is required" });
    }

    // Update user's push token
    await promisePool.query(
      `UPDATE users 
       SET push_token = $1, device_type = $2 
       WHERE id = $3`,
      [push_token, device_type || 'ios', userId]
    );

    res.json({ 
      message: "Push token updated successfully",
      success: true 
    });
  } catch (error) {
    console.error("Error updating push token:", error);
    res.status(500).json({ 
      message: "Failed to update push token",
      error: error.message 
    });
  }
};