// routes/notifications.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getNotifications, markAllRead } = require('../controllers/notificationController');

router.use(requireAuth);

router.get('/',             getNotifications); // GET   /api/notifications
router.patch('/read-all',   markAllRead);      // PATCH /api/notifications/read-all

module.exports = router;
