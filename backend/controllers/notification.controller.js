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
// 1. Get Notifications
// 1. Get Notifications
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT 
        n.id, 
        n.title, 
        n.body, 
        n.data, 
        n.created_at,
        CASE 
          WHEN n.user_id IS NOT NULL THEN n.is_read
          WHEN gnr.user_id IS NOT NULL THEN true
          ELSE false 
        END as is_read 
      FROM notifications n
      -- JOIN the users table so we can check their region/role against the JSON filter
      JOIN users u ON u.id = $1 
      LEFT JOIN global_notification_reads gnr 
        ON n.id = gnr.notification_id AND gnr.user_id = $1
      WHERE 
        n.user_id = $1 
        OR (
          n.user_id IS NULL 
          AND (
            -- 1. If there's no filter, it's for everyone (General Notification)
            n.data->'target_filter' IS NULL 
            OR 
            -- 2. If there IS a filter, it must match the user's region/role
            (
              (n.data->'target_filter'->>'region' IS NULL OR n.data->'target_filter'->>'region' = u.region)
              AND 
              (n.data->'target_filter'->>'role' IS NULL OR n.data->'target_filter'->>'role' = u.role)
            )
          )
        )
      ORDER BY n.created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    const result = await promisePool.query(query, [userId, limit, offset]);

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
//sdadsadasd
    res.status(200).json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// 2. Mark Single Notification as Read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) return res.status(400).json({ error: 'Notification ID is required' });

    // Step 1: Find out if it's a global or private notification
    const check = await promisePool.query('SELECT user_id FROM notifications WHERE id = $1', [id]);
    
    if (check.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notif = check.rows[0];

    // Step 2: Update read state accordingly
    if (notif.user_id === null) {
      // Global Notification -> Insert to Pivot table
      // (ON CONFLICT DO NOTHING ensures if they click it twice, the app doesn't crash)
      await promisePool.query(
        'INSERT INTO global_notification_reads (user_id, notification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, id]
      );
    } else if (notif.user_id === userId) {
      // Private Notification -> Update the column
      await promisePool.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    } else {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// 3. Mark ALL Notifications as Read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // A. Mark all Private notifications as read
    await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    // B. Mark all current Global & Filtered Batch notifications as read for this user
    await promisePool.query(
      `INSERT INTO global_notification_reads (user_id, notification_id)
       SELECT $1, n.id FROM notifications n
       JOIN users u ON u.id = $1
       WHERE n.user_id IS NULL 
         AND (
           n.data->'target_filter' IS NULL 
           OR (
             (n.data->'target_filter'->>'region' IS NULL OR n.data->'target_filter'->>'region' = u.region)
             AND 
             (n.data->'target_filter'->>'role' IS NULL OR n.data->'target_filter'->>'role' = u.role)
           )
         )
       ON CONFLICT DO NOTHING`,
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


export const sendNotificationToAll = async (req, res) => {
  try {

    const { title, body, data, batchSize, delayMs } = req.body;

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