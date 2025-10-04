// routes/notification.route.js
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { adminRoute } from '../middleware/admin.middleware.js';
import NotificationService from '../services/notification.service.js';
import { promisePool } from '../lib/db.js';

const router = express.Router();

/**
 * Register/Update push token for the authenticated user
 */
router.post('/push-token', protectRoute, async (req, res) => {
  try {
    const { push_token, device_type } = req.body;
    const userId = req.user.id;

    if (!push_token) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    const result = await NotificationService.updateUserPushToken(userId, push_token, device_type);

    if (result.success) {
      res.json({ message: 'Push token updated successfully' });
    } else {
      res.status(400).json({ error: result.error || 'Failed to update push token' });
    }
  } catch (error) {
    console.error('Error updating push token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Remove push token (for logout)
 */
router.delete('/push-token', protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;
    await NotificationService.removeUserPushToken(userId);
    res.json({ message: 'Push token removed successfully' });
  } catch (error) {
    console.error('Error removing push token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get notifications for authenticated user
 */
router.get('/', protectRoute, async (req, res) => {
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

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Mark notification as read
 */
router.patch('/:id/read', protectRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * Mark all notifications as read for authenticated user
 */
router.patch('/read-all', protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;

    await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

/**
 * Get unread notification count
 */
router.get('/unread-count', protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await promisePool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ========== ADMIN ROUTES ==========

/**
 * Send notification to specific user (Admin only)
 */
router.post('/send-to-user', protectRoute, adminRoute, async (req, res) => {
  try {
    const { user_id, title, body, data } = req.body;

    if (!user_id || !title || !body) {
      return res.status(400).json({ error: 'user_id, title, and body are required' });
    }

    const result = await NotificationService.sendPushNotification(user_id, title, body, data);

    if (result.success) {
      res.json({ 
        message: 'Notification sent successfully',
        ticket: result.ticket 
      });
    } else {
      res.status(400).json({ 
        error: result.message || 'Failed to send notification' 
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send notification to multiple users (Admin only)
 */
router.post('/send-to-multiple', protectRoute, adminRoute, async (req, res) => {
  try {
    const { user_ids, title, body, data } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const result = await NotificationService.sendPushNotificationToMultiple(
      user_ids, 
      title, 
      body, 
      data
    );

    if (result.success) {
      res.json({ 
        message: 'Notifications sent successfully',
        sentCount: result.sentCount,
        tickets: result.tickets 
      });
    } else {
      res.status(400).json({ 
        error: result.message || 'Failed to send notifications' 
      });
    }
  } catch (error) {
    console.error('Error sending multiple notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send notification to all users (Admin only)
 */
router.post('/send-to-all', protectRoute, adminRoute, async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const result = await NotificationService.sendPushNotificationToAll(title, body, data);

    if (result.success) {
      res.json({ 
        message: 'Notifications sent to all users',
        sentCount: result.sentCount 
      });
    } else {
      res.status(400).json({ 
        error: result.message || 'Failed to send notifications' 
      });
    }
  } catch (error) {
    console.error('Error sending notification to all:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send notification to users by role (Admin only)
 */
router.post('/send-by-role', protectRoute, adminRoute, async (req, res) => {
  try {
    const { role, title, body, data } = req.body;

    if (!role || !title || !body) {
      return res.status(400).json({ error: 'role, title, and body are required' });
    }

    const result = await NotificationService.sendPushNotificationByRole(
      role, 
      title, 
      body, 
      data
    );

    if (result.success) {
      res.json({ 
        message: `Notifications sent to all ${role} users`,
        sentCount: result.sentCount 
      });
    } else {
      res.status(400).json({ 
        error: result.message || 'Failed to send notifications' 
      });
    }
  } catch (error) {
    console.error('Error sending notification by role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all notifications (Admin only) with pagination
 */
router.get('/all', protectRoute, adminRoute, async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id } = req.query;

    let query = `
      SELECT n.*, u.name as user_name 
      FROM notifications n
      JOIN users u ON n.user_id = u.id
    `;
    const params = [];

    if (user_id) {
      query += ' WHERE n.user_id = $1';
      params.push(user_id);
    }

    query += ' ORDER BY n.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await promisePool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Get notification statistics (Admin only)
 */
router.get('/stats', protectRoute, adminRoute, async (req, res) => {
  try {
    const stats = await promisePool.query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
      FROM notifications
    `);

    const pushTokenStats = await promisePool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(push_token) as users_with_tokens,
        COUNT(CASE WHEN device_type = 'ios' THEN 1 END) as ios_users,
        COUNT(CASE WHEN device_type = 'android' THEN 1 END) as android_users
      FROM users
      WHERE active = true
    `);

    res.json({
      notifications: stats.rows[0],
      pushTokens: pushTokenStats.rows[0]
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;