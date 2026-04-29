// routes/tasks.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  getTasks, createTask, updateTask, updateTaskStatus, deleteTask
} = require('../controllers/taskController');
const { getComments, addComment, deleteComment } = require('../controllers/commentController');

// All task routes require a valid login
router.use(requireAuth);

router.get('/',                          getTasks);           // GET    /api/tasks
router.post('/',                         createTask);         // POST   /api/tasks
router.put('/:id',                       updateTask);         // PUT    /api/tasks/:id
router.patch('/:id/status',              updateTaskStatus);   // PATCH  /api/tasks/:id/status
router.delete('/:id',                    deleteTask);         // DELETE /api/tasks/:id

// ── Comments ──────────────────────────────────────────────────
router.get('/:id/comments',              getComments);        // GET    /api/tasks/:id/comments
router.post('/:id/comments',             addComment);         // POST   /api/tasks/:id/comments
router.delete('/:id/comments/:commentId', deleteComment);     // DELETE /api/tasks/:id/comments/:commentId

module.exports = router;
