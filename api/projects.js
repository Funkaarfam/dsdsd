// api/projects.js — Vercel Serverless Function
// GET /api/projects
// Reads projects from /data/projects.json and returns them.
// To add/edit projects: just edit data/projects.json and redeploy.

const path = require('path');
const fs   = require('fs');

module.exports = async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'projects.json');
    const raw      = fs.readFileSync(filePath, 'utf8');
    const projects = JSON.parse(raw);

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(projects);

  } catch (err) {
    console.error('[/api/projects]', err.message);
    return res.status(500).json({ error: 'Could not load projects.' });
  }
};
