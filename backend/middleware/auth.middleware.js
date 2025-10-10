import jwt from "jsonwebtoken";
import { promisePool } from "../lib/db.js";

export const protectRoute = async (req, res, next) => {
  // Check for token in cookies (web) or Authorization header (mobile)
  let accessToken = req.cookies && req.cookies.accessToken;
  
  // If no cookie token, check Authorization header
  if (!accessToken) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }
  
  if (!accessToken) {
    return res.status(401).json({ message: "Unauthorized - No access token provided" });
  }
  
  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    
    // Ensure all fields needed by req.user are selected
    const result = await promisePool.query(
      'SELECT id, name, role, active,region  FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }
    
    const user = result.rows[0];
    
    if (!user.active) {
      // For web users, clear cookies
      if (req.cookies && req.cookies.accessToken) {
        const cookieOptionsBase = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
          path: "/",
        };
        res.clearCookie("accessToken", cookieOptionsBase);
      }
      return res.status(403).json({ message: "Account is inactive. Please contact support." });
    }
    
    req.user = user;
    next();
  } catch (error) {
    let statusCode = 401;
    let message = "Unauthorized - Invalid access token";

    if (error.name === "TokenExpiredError") {
      message = "Unauthorized - Access token expired";
    }
    return res.status(statusCode).json({ message });
  }
};

export const adminRoute = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "manager")) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied - Admin or Manager only" });
  }
};


export const managerRoute = (req, res, next) => {
  if (req.user &&  req.user.role === "manager") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied - Admin or Manager only" });
  }
};





