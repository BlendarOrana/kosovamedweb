// backend/controllers/notification.controller.js

import { admin } from "../lib/firebase.js";
import { promisePool } from "../lib/db.js";

// Helper function to send notifications in batches
const sendNotificationBatch = async (tokens, notification, data = {}) => {
  const BATCH_SIZE = 50;
  const DELAY_MS = 100;
  const results = {
    successful: 0,
    failed: 0,
    failedTokens: []
  };

  // Filter out null/undefined tokens
  const validTokens = tokens.filter(token => token);

  // Process tokens in batches
  for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
    const batch = validTokens.slice(i, i + BATCH_SIZE);
    
    // Create message for this batch
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      tokens: batch
    };

    try {
      // Send to FCM
      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Process results
      results.successful += response.successCount;
      results.failed += response.failureCount;
      
      // Collect failed tokens for cleanup
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          results.failedTokens.push({
            token: batch[index],
            error: resp.error?.message || 'Unknown error'
          });
        }
      });
      
      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < validTokens.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    } catch (error) {
      console.error(`Error sending batch ${i / BATCH_SIZE + 1}:`, error);
      results.failed += batch.length;
    }
  }

  return results;
};

// Send notification to all active users
export const sendNotificationToAll = async (req, res) => {
  const { title, body, imageUrl, data } = req.body;

  try {
    // Validate input
    if (!title || !body) {
      return res.status(400).json({ 
        message: "Title and body are required" 
      });
    }

    // Get all active users with FCM tokens
    const result = await promisePool.query(
      `SELECT id, name, fcm_token 
       FROM users 
       WHERE active = true 
       AND fcm_token IS NOT NULL`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "No active users with push notifications enabled" 
      });
    }

    const tokens = result.rows.map(user => user.fcm_token);

    // Send notifications in batches
    const results = await sendNotificationBatch(
      tokens, 
      { title, body, imageUrl },
      data || {}
    );

    // Clean up invalid tokens
    if (results.failedTokens.length > 0) {
      const invalidTokens = results.failedTokens
        .filter(ft => ft.error.includes('registration-token-not-registered'))
        .map(ft => ft.token);
      
      if (invalidTokens.length > 0) {
        await promisePool.query(
          `UPDATE users 
           SET fcm_token = NULL 
           WHERE fcm_token = ANY($1)`,
          [invalidTokens]
        );
      }
    }

    res.json({
      message: "Notifications sent successfully",
      stats: {
        total: tokens.length,
        successful: results.successful,
        failed: results.failed
      }
    });

  } catch (error) {
    console.error("Error sending notifications to all:", error);
    res.status(500).json({ 
      message: "Failed to send notifications",
      error: error.message 
    });
  }
};

// Send notification to specific user
export const sendNotificationToUser = async (req, res) => {
  const { userId } = req.params;
  const { title, body, imageUrl, data } = req.body;

  try {
    // Validate input
    if (!title || !body) {
      return res.status(400).json({ 
        message: "Title and body are required" 
      });
    }

    // Get user's FCM token
    const result = await promisePool.query(
      `SELECT id, name, fcm_token 
       FROM users 
       WHERE id = $1 
       AND active = true 
       AND fcm_token IS NOT NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "User not found or push notifications not enabled" 
      });
    }

    const user = result.rows[0];

    // Send single notification
    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl })
      },
      data: {
        ...data,
        userId: user.id.toString(),
        timestamp: new Date().toISOString()
      },
      token: user.fcm_token
    };

    try {
      const response = await admin.messaging().send(message);
      
      res.json({
        message: "Notification sent successfully",
        messageId: response,
        user: {
          id: user.id,
          name: user.name
        }
      });
    } catch (fcmError) {
      // Handle invalid token
      if (fcmError.code === 'messaging/registration-token-not-registered') {
        await promisePool.query(
          'UPDATE users SET fcm_token = NULL WHERE id = $1',
          [userId]
        );
        return res.status(400).json({ 
          message: "User's device token is invalid. Token has been removed." 
        });
      }
      throw fcmError;
    }

  } catch (error) {
    console.error("Error sending notification to user:", error);
    res.status(500).json({ 
      message: "Failed to send notification",
      error: error.message 
    });
  }
};

// Send notification to specific user roles
export const sendNotificationToRole = async (req, res) => {
  const { role, title, body, imageUrl, data } = req.body;

  try {
    // Validate input
    if (!role || !title || !body) {
      return res.status(400).json({ 
        message: "Role, title, and body are required" 
      });
    }

    // Get all users with specified role and FCM tokens
    const result = await promisePool.query(
      `SELECT id, name, fcm_token 
       FROM users 
       WHERE role = $1 
       AND active = true 
       AND fcm_token IS NOT NULL`,
      [role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: `No active ${role}s with push notifications enabled` 
      });
    }

    const tokens = result.rows.map(user => user.fcm_token);

    // Send notifications in batches
    const results = await sendNotificationBatch(
      tokens, 
      { title, body, imageUrl },
      { ...data, targetRole: role }
    );

    res.json({
      message: `Notifications sent to ${role}s successfully`,
      stats: {
        total: tokens.length,
        successful: results.successful,
        failed: results.failed
      }
    });

  } catch (error) {
    console.error("Error sending notifications to role:", error);
    res.status(500).json({ 
      message: "Failed to send notifications",
      error: error.message 
    });
  }
};

