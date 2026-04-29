// routes/users.js
const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getUsers, getUser, createUser, updateUser, updateUserRole, deleteUser, uploadAvatar
} = require('../controllers/userController');

router.use(requireAuth);

router.get('/',              getUsers);                              // GET    /api/users
router.get('/:id',           getUser);                              // GET    /api/users/:id
router.post('/',             requireAdmin, createUser);             // POST   /api/users      — admin only
router.put('/:id',           updateUser);                          // PUT    /api/users/:id
router.patch('/:id/role',    requireAdmin, updateUserRole);         // PATCH  /api/users/:id/role — admin only
router.patch('/:id/avatar',  upload.single('avatar'), uploadAvatar);// PATCH  /api/users/:id/avatar
router.delete('/:id',        requireAdmin, deleteUser);             // DELETE /api/users/:id  — admin only

module.exports = router;
