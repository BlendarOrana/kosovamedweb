import bcrypt from 'bcryptjs';
import { promisePool } from "../lib/db.js";
import { uploadToS3, deleteFromS3, getCloudFrontUrl } from '../lib/s3.js';
import multer from 'multer';
import NotificationService from '../services/notification.service.js'

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

    let query = `
      SELECT id, name, number, role, active, region, title, contract_url, email, profile_image_url, status,
             id_card_number, address, contract_start_date, contract_end_date, license_url
      FROM users
    `;
    
    const queryParams = [];
    
    // If user is a manager, filter by their region
    if (req.user.role === 'manager') {
      query += ` WHERE region = $1`;
      queryParams.push(req.user.region);
    }
    
    
    const result = await promisePool.query(query, queryParams);

    // Process CloudFront URLs for contract_url and profile_image_url
    const users = result.rows.map(user => ({
      ...user,
      contract_url: user.contract_url ? getCloudFrontUrl(user.contract_url) : null,
      profile_image_url: user.profile_image_url ? getCloudFrontUrl(user.profile_image_url) : null,
      license_url: user.license_url ? getCloudFrontUrl(user.license_url) : null
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
  // Use multer to handle multiple file uploads
  upload.fields([
    { name: 'contract', maxCount: 1 },
    { name: 'license', maxCount: 1 }
  ])(req, res, async (err) => {
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
      email,
      id_card_number,
      address,
      contract_start_date,
      contract_end_date
    } = req.body;
    
    try {
      // Get current user data to check for existing contract and license
      const currentUser = await promisePool.query(
        'SELECT contract_url, license_url FROM users WHERE id = $1',
        [id]
      );
      
      if (currentUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const oldContractKey = currentUser.rows[0].contract_url;
      const oldLicenseKey = currentUser.rows[0].license_url;
      let contractKey = oldContractKey;
      let licenseKey = oldLicenseKey;
      
      // Handle contract PDF upload if new file exists
      if (req.files && req.files.contract && req.files.contract[0]) {
        const contractFile = req.files.contract[0];
        const key = `contracts/${Date.now()}-${contractFile.originalname}`;
        
        const uploadResult = await uploadToS3(
          contractFile.buffer,
          key,
          contractFile.originalname,
          contractFile.mimetype,
          false // Don't process PDFs as images
        );
        
        contractKey = uploadResult.Key;
        
        // Delete old contract from S3 if it exists and is different
        if (oldContractKey && oldContractKey !== contractKey) {
          await deleteFromS3(oldContractKey);
        }
      }
      
      // Handle license PDF upload if new file exists
      if (req.files && req.files.license && req.files.license[0]) {
        const licenseFile = req.files.license[0];
        const key = `licenses/${Date.now()}-${licenseFile.originalname}`;
        
        const uploadResult = await uploadToS3(
          licenseFile.buffer,
          key,
          licenseFile.originalname,
          licenseFile.mimetype,
          false // Don't process PDFs as images
        );
        
        licenseKey = uploadResult.Key;
        
        // Delete old license from S3 if it exists and is different
        if (oldLicenseKey && oldLicenseKey !== licenseKey) {
          await deleteFromS3(oldLicenseKey);
        }
      }
      
      // Update the user
      const result = await promisePool.query(`
        UPDATE users
        SET name = $1, number = $2, role = $3, active = $4, region = $5, title = $6, 
            contract_url = $7, email = $8, license_url = $9, id_card_number = $10, 
            address = $11, contract_start_date = $12, contract_end_date = $13
        WHERE id = $14
        RETURNING id, name, number, role, active, region, title, contract_url, email, 
                  license_url, id_card_number, address, contract_start_date, contract_end_date
      `, [name, number, role, active, region, title, contractKey, email, licenseKey, 
          id_card_number, address, contract_start_date, contract_end_date, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const updatedUser = result.rows[0];
      // Process CloudFront URLs for response
      updatedUser.contract_url = updatedUser.contract_url ? getCloudFrontUrl(updatedUser.contract_url) : null;
      updatedUser.license_url = updatedUser.license_url ? getCloudFrontUrl(updatedUser.license_url) : null;
      
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








export const acceptUser = async (req, res) => {
  const { userId } = req.params;
  const { region, contractStartDate } = req.body;

  try {
    // Update status, region, and contract start date
    await promisePool.query(
      'UPDATE users SET status = true, region = $1, contract_start_date = $2 WHERE id = $3',
      [region, contractStartDate, userId]
    );

    res.status(200).json({ message: "User accepted successfully" });

  } catch (error) {
    console.log("Error in acceptUser controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getPendingUsers = async (req, res) => {
  try {

    const result = await promisePool.query(
      `SELECT id, name, email, number, profile_image_url, region, created_at 
       FROM users 
       WHERE status = false
       ORDER BY created_at DESC`,
    );

    const users = result.rows.map(user => ({
      ...user,
      profile_image_url: user.profile_image_url 
        ? getCloudFrontUrl(user.profile_image_url) 
        : null
    }));

    res.status(200).json({ users });

  } catch (error) {
    console.log("Error in getPendingUsers controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};





export const getAllShiftRequests = async (req, res) => {
  try {
    // Base query
    let query = `SELECT 
        sr.id, 
        sr.user_id, 
        sr.requested_shift, 
        sr.status, 
        sr.created_at,
        u.name,
        u.email,
        u.profile_image_url,
        u.region
      FROM shift_requests sr
      JOIN users u ON sr.user_id = u.id`;
    
    const queryParams = [];
    
    // If user is a manager, filter by their region
    if (req.user.role === 'manager') {
      query += ` WHERE u.region = $1`;
      queryParams.push(req.user.region);
    }
    
    query += ` ORDER BY sr.created_at DESC`;

    const result = await promisePool.query(query, queryParams);

    const requests = result.rows.map(request => ({
      ...request,
      profile_image_url: request.profile_image_url 
        ? getCloudFrontUrl(request.profile_image_url) 
        : null
    }));

    // Classify requests by status
    const classified = {
      pending: requests.filter(r => r.status === 'pending'),
      approved: requests.filter(r => r.status === 'approved'),
      rejected: requests.filter(r => r.status === 'rejected')
    };

    res.status(200).json({ requests: classified });

  } catch (error) {
    console.log("Error in getAllShiftRequests controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update shift request status (approve or reject)
// Update shift request status (approve or reject)
export const updateShiftRequestStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  try {
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    const requestCheck = await promisePool.query(
      'SELECT sr.*, u.name FROM shift_requests sr JOIN users u ON sr.user_id = u.id WHERE sr.id = $1',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: "Shift request not found" });
    }

    if (requestCheck.rows[0].status !== 'pending') {
      return res.status(400).json({ message: "This request has already been processed" });
    }

    const request = requestCheck.rows[0];

    // Update shift request status
    await promisePool.query(
      'UPDATE shift_requests SET status = $1 WHERE id = $2',
      [status, requestId]
    );

    // If approved, update the user's shift in the users table
    if (status === 'approved') {
      await promisePool.query(
        'UPDATE users SET shift = $1 WHERE id = $2',
        [request.requested_shift, request.user_id]
      );
    }

    // Send notification
    const title = status === 'approved' 
      ? 'Kërkesa për ndryshim turni u pranua' 
      : 'Kërkesa për ndryshim turni u refuzua';
    
    const body = status === 'approved'
      ? `Kërkesa juaj për ndryshim në turnin ${request.requested_shift} u pranua me sukses.`
      : `Kërkesa juaj për ndryshim në turnin ${request.requested_shift} u refuzua.`;

    await NotificationService.sendPushNotification(
      request.user_id,
      title,
      body,
      { type: 'shift_request', status, requestId }
    );

    res.status(200).json({ message: `Shift request ${status} successfully` });

  } catch (error) {
    console.log("Error in updateShiftRequestStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};