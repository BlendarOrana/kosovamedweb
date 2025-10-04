// services/notification.service.js
import { Expo } from 'expo-server-sdk';
import { promisePool } from '../lib/db.js';

const expo = new Expo();

export const NotificationService = {
  /**
   * Update user's push token.
   * Changed 'deviceType' to 'platform' to match frontend store.
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
   * Send push notification to a single user.
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

  // ... (sendPushNotificationToMultiple, sendPushNotificationToAll, etc. from your original file can remain unchanged)

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