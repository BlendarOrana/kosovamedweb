// --- START OF FILE backend/lib/db.js ---

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

// This is now the REAL pool object, which has .connect()
export const promisePool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 40,
});

// Optional: Test connection function to verify the DB connection
export const connectDB = async () => {
  try {
    // We'll use the newly named promisePool to test
    const res = await promisePool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully. Time:', res.rows[0].now);
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err.message);
    // It's better not to throw a fatal error here, just log it.
    // The pool will handle retries.
  }
};

// You can call this function once in your main server file (e.g., index.js)
// to verify the connection when the server starts.
// For example:
// import { connectDB } from './lib/db.js';
// connectDB();