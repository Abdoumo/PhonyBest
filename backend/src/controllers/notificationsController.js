const { query } = require('../config/database');

/**
 * GET /api/v1/notifications
 * Get notifications for the current user
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND read = false`,
      [userId]
    );

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(countResult.rows[0].total),
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await query(
      `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications as read for current user
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * DELETE /api/v1/notifications/:id
 * Delete a single notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * DELETE /api/v1/notifications
 * Clear all notifications for current user
 */
const clearAll = async (req, res) => {
  try {
    const userId = req.user.id;

    await query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Clear all notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/notifications
 * Create a notification (admin only) — can target a specific user or all users
 */
const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type = 'info' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const io = req.app.get('io');

    if (user_id === 'all') {
      // Send to all active users
      const users = await query(`SELECT id FROM users WHERE status = 'active'`);
      for (const u of users.rows) {
        const result = await query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
          [u.id, title, message, type]
        );
        if (io) {
          io.to(`user_${u.id}`).emit('new_notification', result.rows[0]);
        }
      }
      res.status(201).json({ success: true, message: `Sent to ${users.rows.length} users` });
    } else {
      const result = await query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
        [user_id, title, message, type]
      );

      if (io) {
        io.to(`user_${user_id}`).emit('new_notification', result.rows[0]);
      }

      res.status(201).json({ success: true, notification: result.rows[0] });
    }
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAll, createNotification };
