// controllers/projectController.js
// CRUD operations for projects.
// - Admins can see and modify ALL projects
// - Members can only see projects they are assigned to

const pool = require('../db/pool');
// Issue #2: email notifications when members are added to a project
const { sendEmail, buildEmailHtml } = require('../utils/email');

// ── Helper: fetch a single project with members and tags ──────
// Uses subqueries to avoid the DISTINCT + JSON_AGG incompatibility in PostgreSQL
async function fetchProject(projectId) {
  const result = await pool.query(
    `SELECT
       p.*,
       (
         SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'initials', u.initials)), '[]')
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = p.id
       ) AS members,
       (
         SELECT COALESCE(ARRAY_AGG(tag), '{}')
         FROM project_tags
         WHERE project_id = p.id
       ) AS tags
     FROM projects p
     WHERE p.id = $1`,
    [projectId]
  );
  return result.rows[0];
}

// ── GET /api/projects ─────────────────────────────────────────
async function getProjects(req, res) {
  try {
    let query;
    let params;

    // All team members see all projects
    query = `
      SELECT
        p.*,
        (
          SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'initials', u.initials)), '[]')
          FROM project_members pm JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = p.id
        ) AS members,
        (
          SELECT COALESCE(ARRAY_AGG(tag), '{}')
          FROM project_tags WHERE project_id = p.id
        ) AS tags
      FROM projects p
      ORDER BY p.created_at DESC`;
    params = [];

    const result = await pool.query(query, params);
    res.json({ projects: result.rows });

  } catch (err) {
    console.error('getProjects error:', err.message);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
}

// ── POST /api/projects ────────────────────────────────────────
async function createProject(req, res) {
  const {
    name, type, status = 'planning', progress = 0,
    color = '#0E8C88', start_date, due_date,
    members = [], tags = []
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, type, status, progress, color, start_date, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [name, type, status, progress, color, start_date, due_date, req.user.id]
    );

    const projectId = result.rows[0].id;

    // Always include the creator as a member
    const allMembers = [...new Set([req.user.id, ...members])];
    for (const userId of allMembers) {
      await pool.query(
        'INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [projectId, userId]
      );
    }

    // Insert tags
    for (const tag of tags) {
      await pool.query(
        'INSERT INTO project_tags (project_id, tag) VALUES ($1,$2)',
        [projectId, tag]
      );
    }

    const project = await fetchProject(projectId);
    res.status(201).json({ project });
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'projects' });

    // Issue #2: notify each added member by email (except the creator).
    // Inner try-catch isolates email failures from the outer catch so we never
    // attempt a second res.json() on an already-sent response.
    try {
      const memberIds = allMembers.filter(id => id !== req.user.id);
      if (memberIds.length > 0) {
        const memberRows = await pool.query(
          'SELECT name, email FROM users WHERE id = ANY($1::int[])', [memberIds]
        );
        for (const member of memberRows.rows) {
          if (!member.email) continue;
          const appUrl = process.env.APP_URL || 'http://localhost:5173';
          sendEmail({
            to:      member.email,
            subject: `You've been added to a project: ${name}`,
            text:    `Hi ${member.name},\n\n` +
                     `${req.user.name} has added you to a project.\n\n` +
                     `Project : ${name}\n` +
                     (type     ? `Type    : ${type}\n`     : '') +
                     (due_date ? `Due     : ${due_date}\n` : '') +
                     `\nOpen the Task Manager here: ${appUrl}`,
            html: buildEmailHtml({
              greeting:   `Hi ${member.name},`,
              intro:      `<strong>${req.user.name}</strong> has added you to a project on the TD Africa Data Team Task Manager.`,
              rows: [
                ['Project', `<strong>${name}</strong>`],
                ['Type',    type],
                ['Due',     due_date],
                ['Added by', req.user.name],
              ],
              buttonText: 'View Project in Task Manager',
              buttonUrl:  appUrl,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error('createProject email error (non-fatal):', emailErr.message);
    }

  } catch (err) {
    console.error('createProject error:', err.message);
    res.status(500).json({ error: 'Failed to create project.' });
  }
}

// ── PUT /api/projects/:id ─────────────────────────────────────
async function updateProject(req, res) {
  const { id } = req.params;
  const { name, type, status, progress, color, start_date, due_date, members, tags } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await pool.query(
      `UPDATE projects SET
         name       = COALESCE($1, name),
         type       = COALESCE($2, type),
         status     = COALESCE($3, status),
         progress   = COALESCE($4, progress),
         color      = COALESCE($5, color),
         start_date = COALESCE($6, start_date),
         due_date   = COALESCE($7, due_date)
       WHERE id = $8`,
      [name, type, status, progress, color, start_date, due_date, id]
    );

    // Update members if provided
    if (Array.isArray(members)) {
      await pool.query('DELETE FROM project_members WHERE project_id = $1', [id]);
      for (const userId of members) {
        await pool.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id, userId]
        );
      }
    }

    // Update tags if provided
    if (Array.isArray(tags)) {
      await pool.query('DELETE FROM project_tags WHERE project_id = $1', [id]);
      for (const tag of tags) {
        await pool.query(
          'INSERT INTO project_tags (project_id, tag) VALUES ($1,$2)',
          [id, tag]
        );
      }
    }

    const project = await fetchProject(id);
    res.json({ project });
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'projects' });

  } catch (err) {
    console.error('updateProject error:', err.message);
    res.status(500).json({ error: 'Failed to update project.' });
  }
}

// ── DELETE /api/projects/:id ──────────────────────────────────
async function deleteProject(req, res) {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted.' });
    const io = req.app.get('io');
    if (io) io.emit('data:refresh', { type: 'projects' });

  } catch (err) {
    console.error('deleteProject error:', err.message);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
}

module.exports = { getProjects, createProject, updateProject, deleteProject };
