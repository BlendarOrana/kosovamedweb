import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import compression from "compression";

// Route imports
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.route.js";
import reportsRoutes from './routes/reports.route.js';
import attendanceRoutes from './routes/attendance.route.js';
import notificationRoutes from './routes/notification.route.js';


import { testS3Connection } from "./lib/s3.js";
import { initializeFirebaseAdmin } from "./lib/firebase.js";

import { connectDB } from "./lib/db.js";
import { sqlInjectionProtection } from './lib/security/postgres.security.js';

dotenv.config();

initializeFirebaseAdmin(); 


const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.set('trust proxy', 1);

// 1. Security Headers with Helmet
app.use(helmet({
  hsts: {
    maxAge: 31536000, 
    includeSubDomains: true, 
    preload: true, 
  },

  frameguard: {
    action: "deny",
  },

  // X-Content-Type-Options to prevent MIME sniffing
  noSniff: true,

  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", process.env.NODE_ENV === "production" ? undefined : "'unsafe-eval'"].filter(Boolean),
      imgSrc: [
        "'self'", 
        "data:", 
        "blob:",
        "https://d1ht3ugugwhy7y.cloudfront.net",
        "https://transportservice67.s3.eu-north-1.amazonaws.com"
      ],
      mediaSrc: [
        "'self'",
        "https://d1ht3ugugwhy7y.cloudfront.net",
        "https://transportservice67.s3.eu-north-1.amazonaws.com"
      ],
      objectSrc: [
        "'self'",
        "https://d1ht3ugugwhy7y.cloudfront.net",
        "https://transportservice67.s3.eu-north-1.amazonaws.com"
      ],
      frameSrc: [
        "'self'",
        "https://d1ht3ugugwhy7y.cloudfront.net"
      ],
      connectSrc: [
        "'self'",
        "https://d1ht3ugugwhy7y.cloudfront.net",
        "https://transportservice67.s3.eu-north-1.amazonaws.com"
      ],
      fontSrc: ["'self'", "data:", "https:"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"]
    },
  },
  crossOriginEmbedderPolicy: false, // Disable COEP to allow cross-origin resources
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources
}));

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Stricter limit for authentication routes
  message: { error: "Too many authentication attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// 3. Body Parsers (keeping your original 10mb limit for file uploads)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Cookie Parser
app.use(cookieParser());

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
const allowedOrigins = [
  'https://www.kosovamed-app.com',
  'https://kosovamed-app.com',
];    
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('This origin is not allowed by CORS.'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// 6. HTTP Parameter Pollution protection
app.use(hpp());

// 7. Performance - Gzip Compression
app.use(compression());

// 8. SQL Injection Protection
app.use(sqlInjectionProtection);

// --- API ROUTES ---
// Auth routes with stricter rate limiting
app.use("/api/auth", authLimiter, authRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

// --- ERROR HANDLING ---
// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

// --- SERVER STARTUP ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();
  testS3Connection();

});

