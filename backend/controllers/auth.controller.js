import jwt from "jsonwebtoken";
import { promisePool } from "../lib/db.js";
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

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
  const { name, password } = req.body;

  try {
    const result = await promisePool.query('SELECT * FROM users WHERE name = $1', [name]);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await promisePool.query(
      `INSERT INTO users (name, password, role, active)
       VALUES ($1, $2, 'user', true) RETURNING id`,
      [name, hashedPassword]
    );

    const newUserId = insertResult.rows[0].id;

    res.status(201).json({
      _id: newUserId,
      name,
      role: 'user',
      active: true
    });

  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: error.message });
  }
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
        active: user.active
      });
    } else {
      res.status(400).json({ message: "Invalid name or password" });
    }

  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mobile login with push token support
export const mobileLogin = async (req, res) => {
  const { name, password, pushToken, deviceType } = req.body;

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
      // Update push token if provided
      if (pushToken) {
        // Import the Expo SDK to validate token
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

      // Generate token with longer expiry for mobile
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
          active: user.active
        }
      });
    } else {
      res.status(400).json({ message: "Invalid name or password" });
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
    const user = req.user; 

    if (user) {
      res.json({
        _id: user.id,
        id: user.id,
        name: user.name,
        number: user.number,
        role: user.role,
        active: user.active,
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