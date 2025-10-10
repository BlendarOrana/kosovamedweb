// controllers/notification.controller.js
import { promisePool } from '../lib/db.js';
import NotificationService from '../services/notification.service.js';

/**
 * Register or update the push token for the authenticated user.
 */
export const updateUserPushToken = async (req, res) => {
  try {
    const { push_token, platform } = req.body;
    const userId = req.user.id;

    if (!push_token) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    const result = await NotificationService.updateUserPushToken(userId, push_token, platform);

    if (result.success) {
      res.status(200).json({ message: 'Push token updated successfully' });
    } else {
      res.status(400).json({ error: result.error || 'Failed to update push token' });
    }
  } catch (error) {
    console.error('Error in updateUserPushToken controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Fetch all notifications for the authenticated user.
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await promisePool.query(
      `SELECT id, title, body, data, is_read, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const formattedNotifications = result.rows.map(n => ({
      id: n.id,
      type: n.data?.type || 'general',
      title: n.title,
      body: n.body,
      is_read: n.is_read,
      created_at: n.created_at,
      product_id: n.data?.product_id,
      product_name: n.data?.product_name,
      product_status: n.data?.product_status,
    }));

    res.status(200).json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Mark a single notification as read.
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const result = await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found or user not authorized' });
    }

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

/**
 * Mark all unread notifications as read for the authenticated user.
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE user_iduser_id = $1 AND is_read = false',
      [userId]
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

/**
 * Removes the push token for a user, typically on logout.
 */
export const removeUserPushToken = async (req, res) => {
  try {
    const userId = req.user.id;
    await NotificationService.removeUserPushToken(userId);
    res.status(200).json({ message: 'Push token removed successfully' });
  } catch (error) {
    console.error('Error removing push token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send notification to a single user by ID
 */
export const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const result = await NotificationService.sendPushNotification(userId, title, body, data);

    if (result.success) {
      res.status(200).json({ message: 'Notification sent successfully!' });
    } else {
      res.status(404).json({ error: result.message || 'Failed to send notification' });
    }
  } catch (error) {
    console.error('Error in sendNotificationToUser controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send notification to a user by their name
 */
export const sendNotificationByName = async (req, res) => {
  try {
    const { userName, title, body, data } = req.body;

    if (!userName || !title || !body) {
      return res.status(400).json({ error: 'userName, title, and body are required' });
    }

    const result = await NotificationService.sendPushNotificationByName(userName, title, body, data);

    if (result.success) {
      res.status(200).json({ message: 'Notification sent successfully!' });
    } else {
      res.status(404).json({ error: result.message || 'Failed to send notification' });
    }
  } catch (error) {
    console.error('Error in sendNotificationByName controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send batch notifications to users by role or region
 */
export const sendBatchNotifications = async (req, res) => {
  try {
    const { role, region, title, body, data, batchSize = 50, delayMs = 1000 } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    if (!role && !region) {
      return res.status(400).json({ error: 'Either role or region must be specified' });
    }

    const filter = {};
    if (role) filter.role = role;
    if (region) filter.region = region;

    const result = await NotificationService.sendBatchNotifications(
      filter,
      title,
      body,
      data,
      batchSize,
      delayMs
    );

    if (result.success) {
      res.status(200).json({
        message: result.message,
        stats: {
          totalUsers: result.totalUsers,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          failedUsers: result.failedUsers
        }
      });
    } else {
      res.status(result.totalUsers === 0 ? 404 : 207).json({
        error: result.message,
        stats: {
          totalUsers: result.totalUsers,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          failedUsers: result.failedUsers
        }
      });
    }
  } catch (error) {
    console.error('Error in sendBatchNotifications controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send notification to all active users
 */
export const sendNotificationToAll = async (req, res) => {
  try {
    const { title, body, data, batchSize = 50, delayMs = 1000 } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const result = await NotificationService.sendToAllUsers(
      title,
      body,
      data,
      batchSize,
      delayMs
    );

    if (result.success) {
      res.status(200).json({
        message: result.message,
        stats: {
          totalUsers: result.totalUsers,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          failedUsers: result.failedUsers
        }
      });
    } else {
      res.status(result.totalUsers === 0 ? 404 : 207).json({
        error: result.message,
        stats: {
          totalUsers: result.totalUsers,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          failedUsers: result.failedUsers
        }
      });
    }
  } catch (error) {
    console.error('Error in sendNotificationToAll controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get notification statistics for admin dashboard
 */
export const getNotificationStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.push_token IS NOT NULL THEN u.id END) as users_with_tokens,
        COUNT(DISTINCT n.id) as total_notifications,
        COUNT(DISTINCT CASE WHEN n.is_read = false THEN n.id END) as unread_notifications
      FROM users u
      LEFT JOIN notifications n ON u.id = n.user_id
      WHERE u.active = true
    `;

    const result = await promisePool.query(statsQuery);

    res.status(200).json({
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};