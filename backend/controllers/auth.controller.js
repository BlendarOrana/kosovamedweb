import jwt from "jsonwebtoken";
import { promisePool } from "../lib/db.js";
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
import { uploadToS3, getCloudFrontUrl } from '../lib/s3.js'; // **Step 1: Import your s3 helper**
import multer from 'multer';

import { sendRegistrationPendingEmail,sendForgotPasswordEmail } from '../services/emailService.js';



// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


const ACCESS_TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours in seconds
const MOBILE_TOKEN_EXPIRY = "1y"; // 1 year for mobile

const generateAccessToken = (userId, isMobile = false) => {
  const expiresIn = isMobile ? MOBILE_TOKEN_EXPIRY : `${ACCESS_TOKEN_EXPIRY_SECONDS}s`;
  
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn,
  });

  return accessToken;
};

const setCookie = (res, accessToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", 
    path: "/",
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS * 1000, 
  };

  res.cookie("accessToken", accessToken, cookieOptions);
};



export const signup = async (req, res) => {
  upload.single('profile_image')(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    const { name, password, email, number, id_card_number, address, title, region } = req.body;

    try {
      const result = await promisePool.query('SELECT * FROM users WHERE name = $1', [name]);
      if (result.rows.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      let profileImageKey = null;
      
      if (req.file) {
        const key = `profiles/${Date.now()}-${req.file.originalname}`;
        
        const uploadResult = await uploadToS3(
          req.file.buffer,
          key,
          req.file.originalname,
          req.file.mimetype,
          true
        );
        
        profileImageKey = uploadResult.Key;
      }

      const insertResult = await promisePool.query(
        `INSERT INTO users (name, password, email, number, id_card_number, address, profile_image_url, title, region, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'user', false) 
         RETURNING id, name, email, number, id_card_number, address, profile_image_url, title, region, role, status`,
        [name, hashedPassword, email, number, id_card_number, address, profileImageKey, title, region]
      );

      const newUser = insertResult.rows[0];
      
      newUser.profile_image_url = newUser.profile_image_url ? getCloudFrontUrl(newUser.profile_image_url) : null;

      // Send registration pending email
      try {
        await sendRegistrationPendingEmail(email, name);
        console.log(`Registration email sent to ${email}`);
      } catch (emailError) {
        // Log the error but don't fail the registration
        console.error('Failed to send registration email:', emailError);
        // Optionally, you could add a flag to retry sending later
      }

      res.status(201).json(newUser);

    } catch (error) {
      console.log("Error in signup controller", error.message);
      res.status(500).json({ message: error.message });
    }
  });
};

// Web login
export const login = async (req, res) => {
  const { name, password } = req.body;

  try {
    const result = await promisePool.query('SELECT * FROM users WHERE name = $1', [name]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid name or password" });
    }

    if (!user.active) {
      return res.status(403).json({ message: "Account is inactive. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const accessToken = generateAccessToken(user.id);
      setCookie(res, accessToken);

      res.json({
        _id: user.id,
        name: user.name,
        number: user.number,
        role: user.role,
        active: user.active,
      });
    } else {
      res.status(400).json({ message: "Invalid name or password" });
    }

  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const mobileLogin = async (req, res) => {
  const { id_card_number, password, pushToken, deviceType } = req.body;

  try {
    // Check both active and status in the query
    const result = await promisePool.query(
      'SELECT * FROM users WHERE id_card_number = $1 AND active = true AND status = true', 
      [id_card_number]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials or account not approved" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Update push token if provided
      if (pushToken) {
        const { Expo } = await import('expo-server-sdk');
        const expo = new Expo();

        if (expo.isExpoPushToken(pushToken)) {
          await promisePool.query(
            'UPDATE users SET push_token = $1, device_type = $2 WHERE id = $3',
            [pushToken, deviceType || 'unknown', user.id]
          );
        } else {
          console.warn('Invalid push token provided:', pushToken);
        }
      }

      let contractUrl = null;
      if (user.contract_url) {
        try {
          const fileUrlResult = getCloudFrontUrl(user.contract_url);
          if (fileUrlResult) {
            contractUrl = fileUrlResult;
          }
        } catch (error) {
          console.error("Error generating file URL for contract:", error.message);
        }
      }

      let licenseUrl = null;
      if (user.license_url) {
        try {
          const fileUrlResult = getCloudFrontUrl(user.license_url);
          if (fileUrlResult) {
            licenseUrl = fileUrlResult;
          }
        } catch (error) {
          console.error("Error generating file URL for license:", error.message);
        }
      }

      let imageUrl = null;
      if (user.profile_image_url) {
        try {
          const imageurl = getCloudFrontUrl(user.profile_image_url);
          if (imageurl) {
            imageUrl = imageurl;
          }
        } catch (error) {
          console.error("Error generating file URL for profile image:", error.message);
        }
      }

      const accessToken = generateAccessToken(user.id, true);

      res.json({
        message: "Login successful",
        token: accessToken,
        user: {
          _id: user.id,
          id: user.id,
          name: user.name,
          number: user.number,
          role: user.role,
          active: user.active,
          region: user.region,
          contract_url: contractUrl,
          license_url: licenseUrl,
          profile_image_url: imageUrl,
          shift: user.shift
        }
      });
    } else {
      res.status(400).json({ message: "Invalid ID card number or password" });
    }

  } catch (error) {
    console.log("Error in mobile login controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Update push token endpoint (for when app refreshes token)
export const updatePushToken = async (req, res) => {
  const { pushToken, deviceType } = req.body;
  const userId = req.user.id;

  try {
    if (!pushToken) {
      return res.status(400).json({ message: "Push token is required" });
    }

    // Import and validate token
    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();
    
    if (!expo.isExpoPushToken(pushToken)) {
      return res.status(400).json({ message: "Invalid Expo push token" });
    }

    await promisePool.query(
      'UPDATE users SET push_token = $1, device_type = $2 WHERE id = $3',
      [pushToken, deviceType || 'unknown', userId]
    );

    res.json({ message: "Push token updated successfully" });
  } catch (error) {
    console.log("Error updating push token:", error.message);
    res.status(500).json({ message: "Failed to update push token" });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear push token on logout
    const userId = req.user?.id;
    if (userId) {
      await promisePool.query(
        'UPDATE users SET push_token = NULL WHERE id = $1',
        [userId]
      );
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.json({ message: "Logged out successfully" });

  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mobile logout
export const mobileLogout = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (userId) {
      // Clear push token on logout
      await promisePool.query(
        'UPDATE users SET push_token = NULL, device_type = NULL WHERE id = $1',
        [userId]
      );
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in mobile logout controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch complete user data from database
    const result = await promisePool.query(
      `SELECT id, name, email, number, role, status, 
              profile_image_url, contract_url, license_url, 
              id_card_number, address, shift, region
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (user) {
      // Generate CloudFront URLs for S3 files
      let profileImageUrl = null;
      if (user.profile_image_url) {
        profileImageUrl = getCloudFrontUrl(user.profile_image_url);
      }

      let contractUrl = null;
      if (user.contract_url) {
        contractUrl = getCloudFrontUrl(user.contract_url);
      }

      let licenseUrl = null;
      if (user.license_url) {
        licenseUrl = getCloudFrontUrl(user.license_url);
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        number: user.number,
        role: user.role,
        status: user.status,
        profile_image_url: profileImageUrl,
        contract_url: contractUrl,
        license_url: licenseUrl,
        id_card_number: user.id_card_number,
        address: user.address,
        shift: user.shift,
        region: user.region
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await promisePool.query(
      'SELECT id, name, number, role, active, push_token IS NOT NULL as has_push_token, device_type FROM users ORDER BY id DESC'
    );

    const users = result.rows.map(user => ({
      _id: user.id,
      id: user.id,
      name: user.name,
      number: user.number,
      role: user.role,
      active: user.active,
      hasPushToken: user.has_push_token,
      deviceType: user.device_type
    }));

    res.json(users);

  } catch (error) {
    console.error("Error fetching all users:", error.message);
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};




// Get all unique regions
export const getRegions = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT region 
      FROM users 
      WHERE region IS NOT NULL 
        AND region != '' 
      ORDER BY region ASC
    `;

    const result = await promisePool.query(query);

    const regions = result.rows.map(row => row.region);

    res.status(200).json({
      success: true,
      count: regions.length,
      data: regions
    });

  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching regions" 
    });
  }
};

// Get all unique titles
export const getTitles = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT title 
      FROM users 
      WHERE title IS NOT NULL 
        AND title != '' 
      ORDER BY title ASC
    `;

    const result = await promisePool.query(query);

    const titles = result.rows.map(row => row.title);

    res.status(200).json({
      success: true,
      count: titles.length,
      data: titles
    });

  } catch (error) {
    console.error("Error fetching titles:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching titles" 
    });
  }
};






export const createShiftRequest = async (req, res) => {
  const { requested_shift } = req.body;
  const userId = req.user.id; // Assuming you have auth middleware that sets req.user

  try {
    // Validate requested_shift
    if (![1, 2].includes(requested_shift)) {
      return res.status(400).json({ message: "Invalid shift. Must be 1 or 2" });
    }

    // Check if user already has a pending request
    const existingRequest = await promisePool.query(
      'SELECT id FROM shift_requests WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ message: "You already have a pending shift request" });
    }

    // Create new shift request
    const result = await promisePool.query(
      'INSERT INTO shift_requests (user_id, requested_shift) VALUES ($1, $2) RETURNING *',
      [userId, requested_shift]
    );

    res.status(201).json({ 
      message: "Shift request submitted successfully",
      request: result.rows[0]
    });

  } catch (error) {
    console.log("Error in createShiftRequest controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's own shift requests
export const getMyShiftRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await promisePool.query(
      `SELECT id, requested_shift, status, created_at 
       FROM shift_requests 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({ requests: result.rows });

  } catch (error) {
    console.log("Error in getMyShiftRequests controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};






export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const result = await promisePool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Security: Always return "OK" even if user doesn't exist so hackers can't fish for emails
    if (!user) {
       return res.json({ message: "Nëse ekziston llogaria, një email u dërgua." });
    }

    // THE SECRET SAUCE: App Secret + Current Password
    // This creates a unique signature. If the user changes password, this token immediately invalidates.
    const secret = process.env.ACCESS_TOKEN_SECRET + user.password;
    
    const payload = {
       email: user.email,
       id: user.id
    };

    // Valid for only 15 minutes
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });

    // IMPORTANT: Point this link to your WEB frontend
    const link = `https://kosovamed-app.com/reset-password/${user.id}/${token}`;

    await sendForgotPasswordEmail(user.email, link);

    res.json({ message: "Linku për ndryshimin e fjalëkalimit u dërgua në email!" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 2. RESET PASSWORD (Triggered by the Website link)
export const resetPassword = async (req, res) => {
  // Use 'params' because the website sends them in URL usually, or 'body' depending on your web form
  const { id, token, newPassword } = req.body; 

  try {
    const result = await promisePool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: "Përdoruesi nuk u gjet." });

    const secret = process.env.ACCESS_TOKEN_SECRET + user.password;

    try {
      // If verifying fails, token is modified or expired
      const payload = jwt.verify(token, secret);
    } catch (err) {
      return res.status(400).json({ message: "Linku ka skaduar ose është i pavlefshëm." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update DB
    await promisePool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);

    res.json({ message: "Fjalëkalimi u ndryshua me sukses!" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error resetting password" });
  }
};
