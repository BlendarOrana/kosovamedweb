// backend/lib/firebase.js

import admin from "firebase-admin";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const initializeFirebaseAdmin = async () => {
  try {
    // This is the robust, cross-platform way to get the directory name in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const serviceAccountPath = path.join(__dirname, '..', 'config', 'serviceAccountKey.json');


    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, "utf8"));

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin SDK initialized successfully.");
    }
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error);
    // Exit the process if Firebase fails to initialize, as it's a critical dependency.
    process.exit(1);
  }
};

export { admin, initializeFirebaseAdmin };
