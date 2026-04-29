// server/controllers/commentController.js
// Handles task comments and the activity log.

const pool = require('../db/pool');

// ── GET /api/tasks/:id/comments ───────────────────────────────
// Returns all comments + activity for a task, newest first.
async function getComments(req, res) {
  const { id } = req.params;
  try {
    const [comments, activity] = await Promise.all([
      pool.query(
        `SELECT tc.id, tc.content, tc.created_at,
                u.id AS user_id, u.name, u.initials, u.avatar_url
         FROM task_comments tc
         JOIN users u ON u.id = tc.user_id
         WHERE tc.task_id = $1
         ORDER BY tc.created_at ASC`,
        [id]
      ),
      pool.query(
        `SELECT ta.id, ta.action, ta.detail, ta.created_at,
                u.name, u.initials
         FROM task_activity ta
         LEFT JOIN users u ON u.id = ta.user_id
         WHERE ta.task_id = $1
         ORDER BY ta.created_at ASC`,
        [id]
      ),
    ]);
    res.json({ comments: comments.rows, activity: activity.rows });
  } catch (err) {
    console.error('getComments error:', err.message);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
}

// ── POST /api/tasks/:id/comments ──────────────────────────────
// Add a new comment. Any authenticated user can comment.
async function addComment(req, res) {
  const { id }      = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [id, req.user.id, content.trim()]
    );

    res.status(201).json({
      comment: {
        ...result.rows[0],
        user_id:    req.user.id,
        name:       req.user.name,
        initials:   req.user.initials,
        avatar_url: req.user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error('addComment error:', err.message);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
}

// ── DELETE /api/tasks/:id/comments/:commentId ─────────────────
// Users can delete their own comments; admins can delete any comment.
async function deleteComment(req, res) {
  const { commentId } = req.params;
  try {
    const found = await pool.query(
      'SELECT user_id FROM task_comments WHERE id = $1',
      [commentId]
    );
    if (!found.rows[0]) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    if (req.user.role !== 'admin' && req.user.id !== found.rows[0].user_id) {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }
    await pool.query('DELETE FROM task_comments WHERE id = $1', [commentId]);
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error('deleteComment error:', err.message);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
}

// ── Utility: log an activity entry ───────────────────────────
// Called internally by taskController when a task is moved or edited.
// Not exposed as a route — used as a helper.
async function logActivity(taskId, userId, action, detail) {
  try {
    await pool.query(
      'INSERT INTO task_activity (task_id, user_id, action, detail) VALUES ($1, $2, $3, $4)',
      [taskId, userId, action, detail || null]
    );
  } catch (err) {
    // Non-critical — don't let a logging failure break the main action
    console.error('logActivity error:', err.message);
  }
}

module.exports = { getComments, addComment, deleteComment, logActivity };
