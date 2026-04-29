// controllers/notificationController.js
const pool = require('../db/pool');

// GET /api/notifications — returns notifications for the logged-in user
async function getNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('getNotifications error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

// PATCH /api/notifications/read-all — mark all as read for the logged-in user
async function markAllRead(req, res) {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('markAllRead error:', err.message);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}

module.exports = { getNotifications, markAllRead };
