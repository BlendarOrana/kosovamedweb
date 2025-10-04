// services/notification.service.js
import { Expo } from 'expo-server-sdk';
import { promisePool } from '../lib/db.js';

// Create a new Expo SDK client
const expo = new Expo();

export const NotificationService = {
  /**
   * Send push notification to a single user
   */
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      // Get user's push token from database
      const result = await promisePool.query(
        'SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].push_token) {
        console.log(`No push token found for user ${userId}`);
        return { success: false, message: 'No push token found' };
      }

      const pushToken = result.rows[0].push_token;

      // Check that the push token is valid
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return { success: false, message: 'Invalid push token' };
      }

      // Create the message
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        badge: 1,
      };

      // Send the notification
      const chunk = [message];
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      
      // Store notification in database for history
      await this.saveNotificationToDatabase(userId, title, body, data);

      return { success: true, ticket: ticketChunk[0] };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send push notification to multiple users
   */
  async sendPushNotificationToMultiple(userIds, title, body, data = {}) {
    try {
      // Get push tokens for all users
      const result = await promisePool.query(
        'SELECT id, push_token FROM users WHERE id = ANY($1) AND push_token IS NOT NULL',
        [userIds]
      );

      if (result.rows.length === 0) {
        console.log('No push tokens found for any users');
        return { success: false, message: 'No push tokens found' };
      }

      const messages = [];
      const userTokenMap = {};

      // Create messages for each valid push token
      for (const row of result.rows) {
        if (Expo.isExpoPushToken(row.push_token)) {
          messages.push({
            to: row.push_token,
            sound: 'default',
            title,
            body,
            data: { ...data, userId: row.id },
            priority: 'high',
            badge: 1,
          });
          userTokenMap[row.push_token] = row.id;
        }
      }

      if (messages.length === 0) {
        return { success: false, message: 'No valid push tokens found' };
      }

      // Send notifications in chunks (Expo recommends chunks of 100)
      const chunks = this.chunkArray(messages, 100);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending chunk:', error);
        }
      }

      // Save notifications to database for all users
      for (const userId of userIds) {
        await this.saveNotificationToDatabase(userId, title, body, data);
      }

      return { success: true, tickets, sentCount: messages.length };
    } catch (error) {
      console.error('Error sending multiple push notifications:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send notification to all users with push tokens
   */
  async sendPushNotificationToAll(title, body, data = {}) {
    try {
      const result = await promisePool.query(
        'SELECT id FROM users WHERE push_token IS NOT NULL AND active = true'
      );
      
      if (result.rows.length === 0) {
        return { success: false, message: 'No users with push tokens found' };
      }

      const userIds = result.rows.map(row => row.id);
      return await this.sendPushNotificationToMultiple(userIds, title, body, data);
    } catch (error) {
      console.error('Error sending notification to all:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send notification to users by role
   */
  async sendPushNotificationByRole(role, title, body, data = {}) {
    try {
      const result = await promisePool.query(
        'SELECT id FROM users WHERE role = $1 AND push_token IS NOT NULL AND active = true',
        [role]
      );
      
      if (result.rows.length === 0) {
        return { success: false, message: `No users with role ${role} and push tokens found` };
      }

      const userIds = result.rows.map(row => row.id);
      return await this.sendPushNotificationToMultiple(userIds, title, body, data);
    } catch (error) {
      console.error('Error sending notification by role:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save notification to database for history/tracking
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
   * Update user's push token
   */
  async updateUserPushToken(userId, pushToken, deviceType = null) {
    try {
      // Validate the push token
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      await promisePool.query(
        'UPDATE users SET push_token = $1, device_type = $2 WHERE id = $3',
        [pushToken, deviceType, userId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating push token:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove user's push token (on logout or token expiry)
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
   * Check receipt for sent notifications (optional - for tracking delivery)
   */
  async checkNotificationReceipts(tickets) {
    const receiptIds = tickets
      .filter(ticket => ticket.status === 'ok')
      .map(ticket => ticket.id);

    if (receiptIds.length === 0) {
      return [];
    }

    const receiptIdChunks = this.chunkArray(receiptIds, 100);
    const receipts = [];

    for (const chunk of receiptIdChunks) {
      try {
        const receiptsChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        receipts.push(receiptsChunk);
      } catch (error) {
        console.error('Error fetching receipts:', error);
      }
    }

    return receipts;
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