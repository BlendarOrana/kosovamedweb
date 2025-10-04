// controllers/notification.controller.js
import { promisePool } from '../lib/db.js';
import NotificationService from '../services/notification.service.js';

/**
 * Register or update the push token for the authenticated user.
 */
export const updateUserPushToken = async (req, res) => {
  try {
    // The endpoint in the frontend is /api/users/push-token, but the body contains push_token.
    // Let's stick to the frontend's store implementation.
    const { push_token, platform } = req.body;
    const userId = req.user.id; // comes from protectRoute middleware

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

    // Frontend store expects `product_id`, `product_name` directly in the notification object
    // We can parse the `data` field to provide this
    const formattedNotifications = result.rows.map(n => ({
      id: n.id,
      type: n.data?.type || 'general', // Assuming type is stored in data
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
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
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