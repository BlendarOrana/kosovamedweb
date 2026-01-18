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
import userRoutes from './routes/user.route.js';
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
  windowMs: 10 * 60 * 1000,
  max: 150, 
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Cookie Parser (MUST come before CSRF)
app.use(cookieParser());

// 5. CORS Configuration (MUST come before CSRF)
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'CSRF-Token', 'X-Client-Type'],
}));

// 6. HTTP Parameter Pollution protection
app.use(hpp());

// 7. Performance - Gzip Compression
app.use(compression());

// 8. SQL Injection Protection
app.use(sqlInjectionProtection);

// 9. CSRF Protection Configuration
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Middleware to conditionally apply CSRF protection
const conditionalCsrfProtection = (req, res, next) => {
  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  // This mimics csurf's internal behavior
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Check if request is from mobile app
  const clientType = req.headers['x-client-type'];
  
  // Skip CSRF for mobile apps on state-changing methods
  if (clientType === 'mobile' || clientType === 'react-native') {
    return next();
  }
  
  // Apply CSRF protection for web clients on state-changing methods
  csrfProtection(req, res, next);
};

// CSRF token endpoint - for web clients only
app.get('/api/csrf-token', (req, res) => {
  const clientType = req.headers['x-client-type'];
  
  // Mobile apps don't need CSRF tokens
  if (clientType === 'mobile' || clientType === 'react-native') {
    return res.json({ csrfToken: null });
  }
  
  // Generate token for web clients
  csrfProtection(req, res, (err) => {
    if (err) return next(err);
    res.json({ csrfToken: req.csrfToken() });
  });
});

// Apply rate limiting and conditional CSRF to API routes
app.use('/api/', apiLimiter, conditionalCsrfProtection);

// --- API ROUTES ---
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

// --- ERROR HANDLING ---
app.use(/^\/api\/.*/, (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle CSRF token errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'EBADCSRFTOKEN'
    });
  }
  
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