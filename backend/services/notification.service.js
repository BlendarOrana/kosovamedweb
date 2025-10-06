// services/notification.service.js
import { Expo } from 'expo-server-sdk';
import { promisePool } from '../lib/db.js';

const expo = new Expo();

export const NotificationService = {
  /**
   * Update user's push token.
   */
  async updateUserPushToken(userId, pushToken, platform = null) {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      await promisePool.query(
        'UPDATE users SET push_token = $1, device_type = $2 WHERE id = $3',
        [pushToken, platform, userId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating push token:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove user's push token (on logout).
   */
  async removeUserPushToken(userId) {
    try {
      await promisePool.query(
        'UPDATE users SET push_token = NULL, device_type = NULL WHERE id = $1',
        [userId]
      );
      return { success: true };
    } catch (error) {
      console.error('Error removing push token:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save notification to database.
   */
  async saveNotificationToDatabase(userId, title, body, data = {}) {
    try {
      await promisePool.query(
        `INSERT INTO notifications (user_id, title, body, data, is_read, created_at)
         VALUES ($1, $2, $3, $4, false, NOW())`,
        [userId, title, body, JSON.stringify(data)]
      );
    } catch (error) {
      console.error('Error saving notification to database:', error);
    }
  },

  /**
   * Send push notification to a single user by ID
   */
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      const result = await promisePool.query(
        'SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].push_token) {
        return { success: false, message: 'No push token found' };
      }

      const pushToken = result.rows[0].push_token;

      if (!Expo.isExpoPushToken(pushToken)) {
        return { success: false, message: 'Invalid push token' };
      }

      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        badge: 1,
      };

      await expo.sendPushNotificationsAsync([message]);
      await this.saveNotificationToDatabase(userId, title, body, data);

      return { success: true };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Find user by name and send notification
   */
  async sendPushNotificationByName(userName, title, body, data = {}) {
    try {
      const result = await promisePool.query(
        'SELECT id, push_token FROM users WHERE name = $1',
        [userName]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = result.rows[0];
      
      if (!user.push_token) {
        return { success: false, message: 'User has no push token registered' };
      }

      return await this.sendPushNotification(user.id, title, body, data);
    } catch (error) {
      console.error('Error sending notification by name:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send notifications to users by role or region with batching
   */
  async sendBatchNotifications(filter, title, body, data = {}, batchSize = 50, delayMs = 1000) {
    try {
      let query = 'SELECT id, push_token, name FROM users WHERE active = true';
      const params = [];
      
      if (filter.role) {
        params.push(filter.role);
        query += ` AND title = $${params.length}`;
      }
      
      if (filter.region) {
        params.push(filter.region);
        query += ` AND region = $${params.length}`;
      }
      
      query += ' AND push_token IS NOT NULL';
      
      const result = await promisePool.query(query, params);
      
      if (result.rows.length === 0) {
        return { 
          success: false, 
          message: 'No users found matching the criteria with push tokens',
          totalUsers: 0,
          sentCount: 0,
          failedCount: 0
        };
      }

      const users = result.rows;
      const batches = this.chunkArray(users, batchSize);
      
      let sentCount = 0;
      let failedCount = 0;
      const failedUsers = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Process each batch
        const messages = [];
        const validUsers = [];
        
        for (const user of batch) {
          if (Expo.isExpoPushToken(user.push_token)) {
            messages.push({
              to: user.push_token,
              sound: 'default',
              title,
              body,
              data,
              priority: 'high',
              badge: 1,
            });
            validUsers.push(user);
          } else {
            failedCount++;
            failedUsers.push({ id: user.id, name: user.name, reason: 'Invalid push token' });
          }
        }

        if (messages.length > 0) {
          try {
            const tickets = await expo.sendPushNotificationsAsync(messages);
            
            // Save notifications to database for valid users
            for (const user of validUsers) {
              await this.saveNotificationToDatabase(user.id, title, body, data);
              sentCount++;
            }
          } catch (error) {
            console.error('Error sending batch:', error);
            failedCount += validUsers.length;
            validUsers.forEach(user => {
              failedUsers.push({ id: user.id, name: user.name, reason: 'Send failed' });
            });
          }
        }

        // Add delay between batches to avoid overloading
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      return {
        success: sentCount > 0,
        message: `Sent to ${sentCount} users, ${failedCount} failed`,
        totalUsers: users.length,
        sentCount,
        failedCount,
        failedUsers: failedUsers.length > 0 ? failedUsers : undefined
      };
    } catch (error) {
      console.error('Error in batch notification:', error);
      return { 
        success: false, 
        error: error.message,
        totalUsers: 0,
        sentCount: 0,
        failedCount: 0
      };
    }
  },

  async sendToAllUsers(title, body, data = {}, batchSize = 50, delayMs = 1000) {
    return await this.sendBatchNotifications({}, title, body, data, batchSize, delayMs);
  },

  /**
   * Utility function to chunk arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

export default NotificationService;