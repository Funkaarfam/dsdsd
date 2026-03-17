// api/contact.js — Vercel Serverless Function
// POST /api/contact

const RATE_WINDOW  = 60 * 1000;
const MAX_REQUESTS = 3;
const rateLimits   = new Map();

// ── PASTE YOUR DISCORD WEBHOOK URL HERE ──
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1483518123557785720/stALhseuRCHgSvFJye_ERemTpuHuyH5zVDAc2bAlEwq_G6yH-WuRPF340TbXBK7WEHzU';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limit ──────────────────────────────────────────────
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

  // ── Validate ────────────────────────────────────────────────
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

  console.log('[contact]', JSON.stringify(entry));

  // ── Send to Discord ─────────────────────────────────────────
  try {
    const webhookRes = await fetch(DISCORD_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title:       `📩 New message from ${entry.name}`,
          description: entry.message,
          color:       0x14dca0,
          fields: [
            { name: 'Email',   value: entry.email,            inline: true  },
            { name: 'Subject', value: entry.subject || 'N/A', inline: true  },
            { name: 'Time',    value: entry.createdAt,        inline: false },
          ],
        }],
      }),
    });
    console.log('[contact] Discord status:', webhookRes.status);
  } catch (e) {
    console.error('[contact] Discord webhook failed:', e.message);
  }

  return res.status(201).json({ success: true, message: 'Message received!' });
};
