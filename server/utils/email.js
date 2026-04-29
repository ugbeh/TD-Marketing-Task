// server/utils/email.js
// Email notification utility — works like Google Apps Script's MailApp.sendEmail().
//
// HOW IT WORKS:
//   1. If RESEND_API_KEY is set → emails are sent via Resend (resend.com).
//      No SMTP, no admin permissions, no Microsoft tenant settings needed.
//      Just sign up at resend.com, get a free API key, and add it to Render.
//   2. No key set → email content is logged to the server console so you
//      can see what would have been sent. Nothing breaks.
//
// SETUP (2 minutes):
//   1. Go to https://resend.com and sign up for free (3,000 emails/month).
//   2. Create an API key — copy it.
//   3. On Render → your service → Environment, add:
//        RESEND_API_KEY  =  re_xxxxxxxxxxxxxxxxx   (your key from step 2)
//        EMAIL_FROM      =  TD Africa Data Team <notifications@tdafrica.com>
//        APP_URL         =  https://your-render-url.onrender.com
//
// DOMAIN NOTE:
//   To send FROM your own @tdafrica.com address, verify the domain in
//   Resend (Dashboard → Domains → Add). This only requires adding 3 DNS
//   records — no Microsoft 365 admin access needed.
//   While testing, Resend lets you send from onboarding@resend.dev for free.

const { Resend } = require('resend');

// ── Initialise Resend client (once at module load) ────────────────────────────
let resend = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('📧  Email ready — using Resend API');
} else {
  console.log('📧  RESEND_API_KEY not set — emails will be logged to console only.');
}

// Default "from" address.
// - Leave EMAIL_FROM unset (or set to "onboarding@resend.dev") to send immediately.
// - Only set EMAIL_FROM to a custom address after you have verified that domain
//   inside Resend Dashboard → Domains. Unverified domains cause silent failures.
const DEFAULT_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// ── sendEmail({ to, subject, html, text }) ────────────────────────────────────
// to      — recipient email address (string) or array of addresses
// subject — email subject line
// html    — HTML body (recommended — built by buildEmailHtml below)
// text    — plain-text fallback shown by email clients that block HTML
//
// Never throws — all errors are caught and logged so a broken mail config
// can never take down task or project creation.
async function sendEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];

  if (!resend) {
    // ── Console fallback — printed to server log when no API key is set ──
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧  EMAIL (RESEND_API_KEY not configured — console only)');
    console.log(`    To      : ${recipients.join(', ')}`);
    console.log(`    Subject : ${subject}`);
    console.log(`    Body    : ${text || subject}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from:    DEFAULT_FROM,
      to:      recipients,
      subject,
      text:    text || subject,
      html:    html || `<p>${text || subject}</p>`,
    });

    if (error) {
      console.error(`📧  Resend error to ${recipients.join(', ')}:`, error.message);
      // Common cause: EMAIL_FROM domain not verified in Resend.
      // Fix: delete EMAIL_FROM from Render env vars (falls back to onboarding@resend.dev)
      // or verify your domain at resend.com/domains.
      if (error.message?.toLowerCase().includes('domain') ||
          error.message?.toLowerCase().includes('from') ||
          error.message?.toLowerCase().includes('verified')) {
        console.error('📧  Hint: The FROM address domain may not be verified in Resend.');
        console.error(`📧  Current FROM: ${DEFAULT_FROM}`);
        console.error('📧  Quick fix: remove EMAIL_FROM env var or set it to onboarding@resend.dev');
      }
    } else {
      console.log(`📧  Email sent to ${recipients.join(', ')} — id: ${data?.id}`);
    }
  } catch (err) {
    // Non-fatal — log and carry on
    console.error(`📧  Email failed to ${recipients.join(', ')}:`, err.message);
  }
}

// ── buildEmailHtml({ greeting, intro, rows, buttonText, buttonUrl }) ──────────
// Builds a clean, mobile-friendly HTML email with a branded header and a
// call-to-action button that links to the app.
// rows = array of [label, value] pairs shown in a detail table.
// buttonUrl defaults to APP_URL from .env.
function buildEmailHtml({ greeting, intro, rows = [], buttonText = 'Open Task Manager', buttonUrl }) {
  const appUrl = buttonUrl || process.env.APP_URL || 'http://localhost:5173';
  const tableRows = rows
    .filter(([, v]) => v)
    .map(([l, v]) =>
      `<tr>` +
      `<td style="padding:6px 20px 6px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">${l}</td>` +
      `<td style="padding:6px 0;font-size:13px;color:#2A2829">${v}</td>` +
      `</tr>`
    ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F3F5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F5;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07)">

        <!-- Header -->
        <tr><td style="background:#8B1A1A;padding:20px 32px">
          <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:0.5px">
            TD Africa &middot; Data Team
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 8px;font-size:15px;color:#2A2829">${greeting}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#5A5860;line-height:1.6">${intro}</p>

          ${tableRows
            ? `<table cellpadding="0" cellspacing="0" style="margin-bottom:24px">${tableRows}</table>`
            : ''}

          <!-- Call-to-action button -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#8B1A1A;border-radius:6px">
              <a href="${appUrl}" target="_blank"
                 style="display:inline-block;padding:11px 26px;color:#fff;font-size:13px;font-weight:600;text-decoration:none">
                ${buttonText}
              </a>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;font-size:12px;color:#918E98">
            Or copy this link into your browser:<br>
            <a href="${appUrl}" style="color:#8B1A1A">${appUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #E2E0E5;background:#FAFAFA">
          <p style="margin:0;font-size:11px;color:#918E98">
            Automated notification from the TD Africa Data Team Task Manager.<br>
            If you were not expecting this, contact your team administrator.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = { sendEmail, buildEmailHtml };
