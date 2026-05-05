// controllers/taskController.js
// CRUD operations for tasks.
// - Admins can see and modify ALL tasks
// - Members can only see tasks assigned to them or where they are a collaborator

const pool            = require('../db/pool');
const { logActivity } = require('./commentController');
// Issue #2: email notifications when a task is assigned or reassigned
const { sendEmail, buildEmailHtml } = require('../utils/email');

// ── Helper: fetch a single task with all its details ─────────
async function fetchTask(taskId) {
  const result = await pool.query(
    `SELECT
       t.*,
       u.name        AS assignee_name,
       u.initials    AS assignee_initials,
       p.name        AS project_name,
       -- Collaborators as a JSON array
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT('id', cu.id, 'name', cu.name, 'initials', cu.initials)
         ) FILTER (WHERE cu.id IS NOT NULL),
         '[]'
       ) AS collaborators
     FROM tasks t
     LEFT JOIN users u  ON t.assignee_id = u.id
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN task_collaborators tc ON tc.task_id = t.id
     LEFT JOIN users cu ON cu.id = tc.user_id
     WHERE t.id = $1
     GROUP BY t.id, u.name, u.initials, p.name`,
    [taskId]
  );
  return result.rows[0];
}

// ── GET /api/tasks ────────────────────────────────────────────
// Admin: returns all tasks
// Member: returns only tasks where they are the assignee or a collaborator
async function getTasks(req, res) {
  try {
    let query;
    let params;

    // All users see all tasks — full team visibility
    query = `
      SELECT
        t.*,
        u.name     AS assignee_name,
        u.initials AS assignee_initials,
        p.name     AS project_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', cu.id, 'name', cu.name, 'initials', cu.initials)
          ) FILTER (WHERE cu.id IS NOT NULL),
          '[]'
        ) AS collaborators
      FROM tasks t
      LEFT JOIN users u  ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN task_collaborators tc ON tc.task_id = t.id
      LEFT JOIN users cu ON cu.id = tc.user_id
      GROUP BY t.id, u.name, u.initials, p.name
      ORDER BY t.created_at DESC`;
    params = [];

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });

  } catch (err) {
    console.error('getTasks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
}

// ── POST /api/tasks ───────────────────────────────────────────
// Create a new task
async function createTask(req, res) {
  const {
    title, description, status = 'backlog', priority = 'm',
    dept = '', due_date, assignee_id, project_id, collaborators = []
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  try {
    // Insert the task
    const result = await pool.query(
      `INSERT INTO tasks
         (title, description, status, priority, dept, due_date, assignee_id, project_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [title, description, status, priority, dept, due_date, assignee_id, project_id, req.user.id]
    );

    const taskId = result.rows[0].id;

    // Insert collaborators if any
    for (const userId of collaborators) {
      await pool.query(
        'INSERT INTO task_collaborators (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [taskId, userId]
      );
    }

    // Return full task details
    const task = await fetchTask(taskId);
    res.status(201).json({ task });
    // Broadcast to all connected clients so every open browser refreshes
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'tasks' });

    // Issue #2: notify the assignee by email.
    // Wrapped in its own try-catch so email failures never trigger the outer
    // catch, which would attempt a second res.json() on an already-sent response.
    try {
      if (assignee_id) {
        const assigneeResult = await pool.query(
          'SELECT name, email FROM users WHERE id = $1', [assignee_id]
        );
        const assignee = assigneeResult.rows[0];
        if (assignee?.email) {
          const appUrl = process.env.APP_URL || 'http://localhost:5173';
          sendEmail({
            to:      assignee.email,
            subject: `New task assigned to you: ${title}`,
            text:    `Hi ${assignee.name},\n\n` +
                     `${req.user.name} has assigned you a new task.\n\n` +
                     `Task   : ${title}\n` +
                     (description ? `Details: ${description}\n` : '') +
                     (due_date    ? `Due    : ${due_date}\n`    : '') +
                     `\nOpen the Task Manager here: ${appUrl}`,
            html: buildEmailHtml({
              greeting:   `Hi ${assignee.name},`,
              intro:      `<strong>${req.user.name}</strong> has assigned you a new task on the TD Africa Data Team Task Manager.`,
              rows: [
                ['Task',    `<strong>${title}</strong>`],
                ['Details', description],
                ['Due',     due_date],
                ['Assigned by', req.user.name],
              ],
              buttonText: 'View Task in Task Manager',
              buttonUrl:  appUrl,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error('createTask email error (non-fatal):', emailErr.message);
    }

  } catch (err) {
    console.error('createTask error:', err.message);
    res.status(500).json({ error: 'Failed to create task.' });
  }
}

// ── PUT /api/tasks/:id ────────────────────────────────────────
// Update an existing task (title, description, status, priority, etc.)
async function updateTask(req, res) {
  const { id } = req.params;
  const {
    title, description, status, priority,
    dept, due_date, assignee_id, project_id, collaborators
  } = req.body;

  try {
    // Make sure the task exists
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // All team members can edit any task

    await pool.query(
      `UPDATE tasks SET
         title       = COALESCE($1, title),
         description = COALESCE($2, description),
         status      = COALESCE($3, status),
         priority    = COALESCE($4, priority),
         dept        = COALESCE($5, dept),
         due_date    = COALESCE($6, due_date),
         assignee_id = COALESCE($7, assignee_id),
         project_id  = COALESCE($8, project_id)
       WHERE id = $9`,
      [title, description, status, priority, dept, due_date, assignee_id, project_id, id]
    );

    // Update collaborators if provided
    if (Array.isArray(collaborators)) {
      await pool.query('DELETE FROM task_collaborators WHERE task_id = $1', [id]);
      for (const userId of collaborators) {
        await pool.query(
          'INSERT INTO task_collaborators (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, userId]
        );
      }
    }

    const task = await fetchTask(id);
    res.json({ task });
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'tasks' });

    // Issue #2: notify the new assignee if the assignment changed.
    // Inner try-catch prevents email failures from hitting the outer catch
    // (which would try to send a second response on an already-sent one).
    try {
      const oldAssigneeId = existing.rows[0].assignee_id;
      if (assignee_id && assignee_id !== oldAssigneeId) {
        const assigneeResult = await pool.query(
          'SELECT name, email FROM users WHERE id = $1', [assignee_id]
        );
        const assignee = assigneeResult.rows[0];
        if (assignee?.email) {
          const taskTitle = title || existing.rows[0].title;
          const appUrl    = process.env.APP_URL || 'http://localhost:5173';
          sendEmail({
            to:      assignee.email,
            subject: `Task reassigned to you: ${taskTitle}`,
            text:    `Hi ${assignee.name},\n\n` +
                     `${req.user.name} has assigned you a task.\n\n` +
                     `Task: ${taskTitle}\n` +
                     `\nOpen the Task Manager here: ${appUrl}`,
            html: buildEmailHtml({
              greeting:   `Hi ${assignee.name},`,
              intro:      `<strong>${req.user.name}</strong> has assigned you a task on the TD Africa Data Team Task Manager.`,
              rows: [
                ['Task',        `<strong>${taskTitle}</strong>`],
                ['Assigned by', req.user.name],
              ],
              buttonText: 'View Task in Task Manager',
              buttonUrl:  appUrl,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error('updateTask email error (non-fatal):', emailErr.message);
    }

  } catch (err) {
    console.error('updateTask error:', err.message);
    res.status(500).json({ error: 'Failed to update task.' });
  }
}

// ── PATCH /api/tasks/:id/status ───────────────────────────────
// Move a task to a different column (used for drag & drop)
async function updateTaskStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['backlog', 'progress', 'review', 'approved', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    // Get the old status so we can log "Backlog → In Progress" style detail
    const before = await pool.query('SELECT status, title FROM tasks WHERE id = $1', [id]);
    if (!before.rows[0]) return res.status(404).json({ error: 'Task not found.' });

    const oldStatus = before.rows[0].status;

    await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', [status, id]);

    // Log the move to the activity feed
    const labels = { backlog: 'Backlog', progress: 'In Progress', review: 'In Review', approved: 'Approved', done: 'Done' };
    await logActivity(id, req.user.id, 'moved', `${labels[oldStatus]} → ${labels[status]}`);

    res.json({ task: { ...before.rows[0], status } });
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'tasks' });

  } catch (err) {
    console.error('updateTaskStatus error:', err.message);
    res.status(500).json({ error: 'Failed to update task status.' });
  }
}

// ── DELETE /api/tasks/:id ─────────────────────────────────────
async function deleteTask(req, res) {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Only admin or the task owner can delete
    if (req.user.role !== 'admin' && existing.rows[0].assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own tasks.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted.' });
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'tasks' });

  } catch (err) {
    console.error('deleteTask error:', err.message);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
}

module.exports = { getTasks, createTask, updateTask, updateTaskStatus, deleteTask };
