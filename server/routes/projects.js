// routes/projects.js
const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getProjects, createProject, updateProject, deleteProject
} = require('../controllers/projectController');

router.use(requireAuth);

router.get('/',      getProjects);                    // GET    /api/projects
router.post('/',     requireAdmin, createProject);    // POST   /api/projects  (admin only)
router.put('/:id',   requireAdmin, updateProject);    // PUT    /api/projects/:id
router.delete('/:id',requireAdmin, deleteProject);    // DELETE /api/projects/:id

module.exports = router;
