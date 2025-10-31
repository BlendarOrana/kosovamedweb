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
import userRoutes from './routes/user.route.js'; // Import the new user route
import csrf from 'csurf';



import { testS3Connection } from "./lib/s3.js";

import { connectDB } from "./lib/db.js";
import { sqlInjectionProtection } from './lib/security/postgres.security.js';

dotenv.config();



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
  frameguard: { action: "deny" },
  noSniff: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: [
        "'self'",
        process.env.NODE_ENV === "production" ? undefined : "'unsafe-eval'"
      ].filter(Boolean),
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://d2hjyrsp0ml1qs.cloudfront.net",
        "https://kosovamed.s3.eu-north-1.amazonaws.com"
      ],
      mediaSrc: [
        "'self'",
        "https://d2hjyrsp0ml1qs.cloudfront.net",
        "https://kosovamed.s3.eu-north-1.amazonaws.com"
      ],
      objectSrc: [
        "'self'",
        "https://d2hjyrsp0ml1qs.cloudfront.net",
        "https://kosovamed.s3.eu-north-1.amazonaws.com"
      ],
      frameSrc: [
        "'self'",
        "https://d2hjyrsp0ml1qs.cloudfront.net"
      ],
      connectSrc: [
        "'self'",
        "https://d2hjyrsp0ml1qs.cloudfront.net",
        "https://kosovamed.s3.eu-north-1.amazonaws.com"
      ],
      fontSrc: ["'self'", "data:", "https:"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"]
    },
  },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { policy: 'none' },
  dnsPrefetchControl: { allow: false },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));


// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 150, 
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

// 3. Body Parsers (keeping your original 10mb limit for file uploads)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Cookie Parser
app.use(cookieParser());

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.use('/api/', apiLimiter,csrfProtection);


app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      const allowedOrigins = [
        'https://www.kosovamed-app.com',
        'https://kosovamed-app.com',
        'https://kosovamedweb.onrender.com/',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'CSRF-Token'], // Add CSRF-Token here
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
app.use('/api/users', userRoutes); // Use the new user routes for push token

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check DB
    await pool.query('SELECT 1');
    
    // Check S3
    const s3Ok = await testS3Connection();
    
    res.status(200).json({ 
      status: 'OK',
      database: 'connected',
      s3: s3Ok ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR',
      error: 'Service unavailable' 
    });
  }
});

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get(/.*/, (req, res) => {  // Use regex instead of '*'
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}
// --- ERROR HANDLING ---
// 404 handler for API routes - EXPRESS 5 COMPATIBLE
// 404 handler for API routes
app.use(/^\/api\/.*/, (req, res) => {  // Use regex
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

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();

  const s3Ok = await testS3Connection();
  if (s3Ok) {
    console.log(`✅ S3 bucket "${process.env.AWS_BUCKET_NAME}" connected successfully.`);
  } else {
    console.error('❌ S3 connection failed.');
  }
});