# Co3er Development — Vercel Deployment

## Deploy in 3 steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/co3er-dev.git
git push -u origin main
```

### 2. Import on Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Click Deploy — no build settings needed (static + serverless)

### 3. Add environment variables (optional but recommended)
In Vercel → Project Settings → Environment Variables:

| Variable              | Value                        | Purpose                         |
|-----------------------|------------------------------|---------------------------------|
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL     | Get contact form DMs on Discord |
| `RESEND_API_KEY`      | Your Resend.com API key      | Get contact form emails         |
| `RESEND_TO_EMAIL`     | your@email.com               | Where to send emails            |

If neither variable is set, messages are just logged in Vercel's function logs.

## Add / edit projects
Edit `data/projects.json` then push to GitHub — Vercel auto-redeploys.

```json
[
  {
    "id": 1,
    "title": "Your Project",
    "description": "What it does.",
    "bgColor": "#1a2a3a",
    "live": "https://yoursite.com",
    "github": "https://github.com/you/repo"
  }
]
```

## Project structure
```
/
├── index.html          ← Main page
├── styles.css          ← All styles
├── main.js             ← All frontend JS
├── components/
│   └── icons.js        ← SVG icon registry
├── data/
│   └── projects.json   ← YOUR PROJECTS — edit this
├── api/
│   ├── projects.js     ← GET /api/projects  (serverless)
│   └── contact.js      ← POST /api/contact  (serverless)
├── vercel.json         ← Routing config
└── 404.html / 403.html ← Error pages
```
