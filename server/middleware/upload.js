// server/middleware/upload.js
// Multer configuration for avatar photo uploads.
//
// NON-DEVELOPER GUIDE:
//   • Photos are held in memory (not written to disk) so this works on
//     cloud hosts like Render where the filesystem is ephemeral.
//   • The photo is stored as a base64 data URL directly in the database.
//   • Max file size: 3 MB — change the line marked ★ below to adjust.
//   • Accepted types: JPG, PNG, GIF, WebP

const multer = require('multer');

// ── Keep file in memory — no disk writes needed ───────────────
const storage = multer.memoryStorage();

// ── Only accept image files ───────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPG, PNG, GIF, WebP).'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // ★ 3 MB maximum — change to e.g. 5 * 1024 * 1024 for 5 MB
});

module.exports = upload;
