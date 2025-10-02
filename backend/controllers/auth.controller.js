import jwt from "jsonwebtoken";
import { promisePool } from "../lib/db.js";
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours in seconds
const MOBILE_TOKEN_EXPIRY = "1y"; // 1 year for mobile as you requested

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

// Web login (existing)
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

// UPDATED: Mobile login with FCM token support
export const mobileLogin = async (req, res) => {
  const { name, password, fcmToken } = req.body;

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
      // Update FCM token if provided
      if (fcmToken) {
        await promisePool.query(
          'UPDATE users SET fcm_token = $1 WHERE id = $2',
          [fcmToken, user.id]
        );
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

// NEW: Update FCM token endpoint
export const updateFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  const userId = req.user.id;

  try {
    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    await promisePool.query(
      'UPDATE users SET fcm_token = $1 WHERE id = $2',
      [fcmToken, userId]
    );

    res.json({ message: "FCM token updated successfully" });
  } catch (error) {
    console.log("Error updating FCM token:", error.message);
    res.status(500).json({ message: "Failed to update FCM token" });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear FCM token on logout for mobile users
    const userId = req.user?.id;
    if (userId) {
      await promisePool.query(
        'UPDATE users SET fcm_token = NULL WHERE id = $1',
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
      'SELECT id, name, number, role, active FROM users ORDER BY id DESC'
    );

    const users = result.rows.map(user => ({
      _id: user.id,
      id: user.id,
      name: user.name,
      number: user.number,
      role: user.role,
      active: user.active
    }));

    res.json(users);

  } catch (error) {
    console.error("Error fetching all users:", error.message);
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};