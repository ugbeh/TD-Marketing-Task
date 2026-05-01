// routes/auth.js
// Auth endpoints — login, current user, forgot password, reset password.

const router = require('express').Router();
const { login, getMe, forgotPassword, resetPassword, autoLogin, register } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login            — public
router.post('/login', login);

// POST /api/auth/register         — public
router.post('/register', register);

// GET  /api/auth/me               — protected
router.get('/me', requireAuth, getMe);

// POST /api/auth/forgot-password  — public (user not logged in)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password   — public (user not logged in, has token)
router.post('/reset-password', resetPassword);

// POST /api/auth/auto             — public (no credentials needed)
// Returns a shared 30-day session so the dashboard opens without a login prompt
router.post('/auto', autoLogin);

module.exports = router;
