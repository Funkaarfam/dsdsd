// api/contact.js — Vercel Serverless Function
// POST /api/contact
//
// NOTE: Vercel's filesystem is read-only in production, so we can't
// write messages.json to disk. Instead this function logs the message
// and returns success. To actually store/receive messages, uncomment
// one of the integrations below (email via Resend, or Discord webhook).

const RATE_WINDOW  = 60 * 1000; // 1 minute
const MAX_REQUESTS = 3;
const rateLimits   = new Map();  // resets on cold start — good enough for serverless

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limit ────────────────────────────────────────────────
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim()
              ?? req.socket?.remoteAddress
              ?? 'unknown';
  const now = Date.now();
  const rec = rateLimits.get(ip) ?? { count: 0, reset: now + RATE_WINDOW };

  if (now > rec.reset) { rec.count = 0; rec.reset = now + RATE_WINDOW; }
  rec.count++;
  rateLimits.set(ip, rec);

  if (rec.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  // ── Validate ──────────────────────────────────────────────────
  const { name, email, message, subject } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (name.length > 100 || email.length > 200 || message.length > 2000) {
    return res.status(400).json({ error: 'Input too long.' });
  }

  const entry = {
    name:      name.trim(),
    email:     email.trim(),
    subject:   subject?.trim() ?? '',
    message:   message.trim(),
    createdAt: new Date().toISOString(),
    ip,
  };

  // ── Log (always) ─────────────────────────────────────────────
  console.log('[contact]', JSON.stringify(entry));

  // ── Optional: forward to Discord webhook ─────────────────────
  // Set DISCORD_WEBHOOK_URL in your Vercel environment variables.
  if (process.env.DISCORD_WEBHOOK_URL) {
    const WEBHOOK = 'https://discord.com/api/webhooks/1483518123557785720/stALhseuRCHgSvFJye_ERemTpuHuyH5zVDAc2bAlEwq_G6yH-WuRPF340TbXBK7WEHzU';
try {
  await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `📩 New message from ${entry.name}`,
        description: entry.message,
        color: 0x14dca0,
        fields: [
          { name: 'Email',   value: entry.email,            inline: true },
          { name: 'Subject', value: entry.subject || 'N/A', inline: true },
          { name: 'Time',    value: entry.createdAt,        inline: false },
        ],
      }],
    }),
  });
} catch (e) {
  console.error('Webhook failed:', e.message);
}
  }

  // ── Optional: send email via Resend ──────────────────────────
  // 1. Sign up free at resend.com
  // 2. Set RESEND_API_KEY + RESEND_TO_EMAIL in Vercel env vars
  if (process.env.RESEND_API_KEY && process.env.RESEND_TO_EMAIL) {
    try {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from:    'Co3er Contact Form <onboarding@resend.dev>',
          to:      [process.env.RESEND_TO_EMAIL],
          subject: `New contact: ${entry.subject || entry.name}`,
          text:    `Name: ${entry.name}\nEmail: ${entry.email}\n\n${entry.message}`,
        }),
      });
    } catch (emailErr) {
      console.error('[contact] Resend email failed:', emailErr.message);
    }
  }

  return res.status(201).json({ success: true, message: 'Message received!' });
};
